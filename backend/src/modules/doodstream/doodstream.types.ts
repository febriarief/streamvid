export interface DoodstreamFileInfo {
  file_code?: string;
  filecode?: string;
  title: string;
  length: number | string;
  splash_img?: string;
  single_img?: string;
  protected_embed: string;
}

export interface DoodstreamMetadata {
  doodFileId: string;
  title: string;
  duration: number;
  thumbnailUrl: string;
  embedUrl: string;
  doodUrl: string;
}
