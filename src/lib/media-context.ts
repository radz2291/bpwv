import type { Asset } from './contract';
import type { NodeMedia } from './media-view';
export type MediaContext = {
  view: (id: string) => NodeMedia | undefined;
  enlarge: (asset: Asset, id: string) => void;
};
