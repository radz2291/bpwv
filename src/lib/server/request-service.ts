import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { db } from './store';
import { ServiceError } from './workflow-service';
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const mediaSchema = z.object({
  expectedInputHash: z.string(),
  resolutions: z
    .array(
      z.object({
        assetId: z.string(),
        providerAsset: z
          .object({
            id: z.string(),
            url: z
              .string()
              .url()
              .refine((v) => v.startsWith('https://')),
            type: z.string()
          })
          .passthrough()
      })
    )
    .min(1)
});
export class RequestService {
  constructor(private connection: DatabaseSync = db) {}
  get(id: string) {
    const row = this.connection
      .prepare('SELECT document FROM requests WHERE id=?')
      .get(id);
    if (!row)
      throw new ServiceError('NOT_FOUND', 'Generation request not found');
    return JSON.parse(String(row.document));
  }
  private mutate(id: string, update: (request: any) => any) {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const request = this.get(id);
      if (request.status !== 'pending')
        throw new ServiceError(
          'CONFLICT',
          'Only pending requests can be prepared or quoted'
        );
      const next = update(request);
      this.connection
        .prepare('UPDATE requests SET document=? WHERE id=?')
        .run(JSON.stringify(next), id);
      this.connection.exec('COMMIT');
      return next;
    } catch (e) {
      this.connection.exec('ROLLBACK');
      throw e;
    }
  }
  resolveMedia(id: string, raw: unknown) {
    const body = mediaSchema.parse(raw);
    return this.mutate(id, (request) => {
      if (
        request.inputHash !== body.expectedInputHash ||
        hash(request.input) !== request.inputHash
      )
        throw new ServiceError(
          'CONFLICT',
          'Immutable request input hash mismatch'
        );
      if (request.providerInput)
        throw new ServiceError(
          'CONFLICT',
          'Provider inputs already resolved; prepare a fresh request to change references'
        );
      const mappings = new Map(
        body.resolutions.map((r) => [r.assetId, r.providerAsset])
      );
      if (mappings.size !== body.resolutions.length)
        throw Error('Duplicate media resolution');
      const local = request.assetLineage.filter((a: any) =>
        a.uri.startsWith('/api/assets/')
      );
      if (
        local.some((a: any) => !mappings.has(a.id)) ||
        [...mappings.keys()].some((id) => !local.some((a: any) => a.id === id))
      )
        throw Error(
          'Media mapping must match the request local asset identities'
        );
      const providerInput = { ...request.input };
      for (const [field, schema] of Object.entries(request.contract.inputs) as [
        string,
        any
      ][]) {
        if (schema.type !== 'image' || providerInput[field] === undefined)
          continue;
        const values = schema.maxItems
          ? providerInput[field]
          : [providerInput[field]];
        const resolved = values.map((a: any) => {
          if (typeof a === 'string') return a;
          if (a.uri.startsWith('https://')) return a.uri;
          const uploaded = mappings.get(a.id);
          if (!uploaded) throw Error('Unresolved local reference');
          if (uploaded.type !== 'image')
            throw Error('Uploaded reference is not an image');
          return uploaded;
        });
        providerInput[field] = schema.maxItems ? resolved : resolved[0];
      }
      const providerInputHash = hash(providerInput);
      return {
        ...request,
        providerInput,
        providerInputHash,
        mediaResolution: {
          status: 'resolved',
          source: 'official Weave upload reported by trusted local bridge',
          resolvedAt: new Date().toISOString(),
          mappings: body.resolutions.map((r) => ({
            localAssetId: r.assetId,
            providerAsset: r.providerAsset
          }))
        }
      };
    });
  }
  recordQuote(id: string, raw: unknown) {
    const body = z
      .object({
        expectedProviderInputHash: z.string(),
        cost: z.number().finite().nonnegative(),
        quotedAt: z.string().datetime()
      })
      .parse(raw);
    return this.mutate(id, (request) => {
      if (
        !request.providerInput ||
        hash(request.providerInput) !== body.expectedProviderInputHash
      )
        throw new ServiceError(
          'CONFLICT',
          'Resolve exact provider inputs before recording their quotation'
        );
      return {
        ...request,
        providerInputHash: body.expectedProviderInputHash,
        cost: {
          ...request.cost,
          quoted: body.cost,
          quotedAt: body.quotedAt,
          approved: false,
          source: 'official Figma Weave MCP',
          status: body.cost >= 5 ? 'limit_reached' : 'awaiting_user_approval'
        }
      };
    });
  }
  /** Record a human decision reported by the trusted bridge. This never invokes a model. */
  recordApproval(id: string, raw: unknown) {
    const body = z
      .object({
        expectedProviderInputHash: z.string(),
        quotedCost: z.number().nonnegative(),
        decision: z.enum(['approve', 'cancel']),
        decidedAt: z.string().datetime(),
        evidence: z.string().min(1)
      })
      .parse(raw);
    return this.mutate(id, (request) => {
      if (
        !request.providerInput ||
        hash(request.providerInput) !== body.expectedProviderInputHash ||
        request.cost.quoted !== body.quotedCost ||
        body.quotedCost >= 5 ||
        request.cost.status !== 'awaiting_user_approval'
      )
        throw new ServiceError(
          'CONFLICT',
          'Approval requires the exact current quote below five credits'
        );
      return {
        ...request,
        cost: {
          ...request.cost,
          approved: body.decision === 'approve',
          status: body.decision === 'approve' ? 'approved' : 'cancelled',
          decision: {
            ...body,
            source: 'structured human decision reported by trusted bridge'
          }
        }
      };
    });
  }
}
export const requestService = new RequestService();
