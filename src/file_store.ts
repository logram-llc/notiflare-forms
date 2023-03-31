type FileStoreData = string | ReadableStream<any> | ArrayBuffer | ArrayBufferView | Blob

interface IFileStore {
  put(key: string, data: FileStoreData): Promise<string>;
}

class R2FileStore implements IFileStore {
  readonly bucketUrl: string;
  readonly bucket: R2Bucket;

  constructor(bucketUrl: string, bucket: R2Bucket) {
    this.bucketUrl = bucketUrl.endsWith("/")
      ? bucketUrl.slice(0, -1)
      : bucketUrl;
    this.bucket = bucket;
  }

  async put(key: string, data: File): Promise<string> {
    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType: data.type,
      },
      customMetadata: {
        filename: data.name,
      },
    });

    return `${this.bucketUrl}/${key}`;
  }
}

export { R2FileStore };
export type { FileStoreData }
