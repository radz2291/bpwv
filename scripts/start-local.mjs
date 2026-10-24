// Allow multipart overhead above the API's enforced 25 MiB per-file limit.
process.env.BODY_SIZE_LIMIT ??= String(27 * 1024 * 1024);
process.env.HOST ??= '127.0.0.1';
process.env.PORT ??= '5173';
process.env.ORIGIN ??= `http://${process.env.HOST}:${process.env.PORT}`;
await import('../build/index.js');
