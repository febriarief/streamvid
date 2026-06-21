export type BackblazeAuthorizeResponse = {
  accountId: string;
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
  allowed?: {
    bucketId?: string;
    bucketName?: string;
  };
};

export type BackblazeBucket = {
  bucketId: string;
  bucketName: string;
};

export type BackblazeListBucketsResponse = {
  buckets: BackblazeBucket[];
};

export type BackblazeUploadUrlResponse = {
  authorizationToken: string;
  uploadUrl: string;
};

export type UploadedThumbnail = {
  fileName: string;
  url: string;
};

