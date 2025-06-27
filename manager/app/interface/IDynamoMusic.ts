export interface IDynamoMusicBase {
  ID: string; // UID
  DataType: "music" | "user";
  Create: string;
  Update: string;
  Delete: string;
}

export interface IMusicCommon extends IDynamoMusicBase {
  DataType: "music";
  MusicID: string;
  Title: string;
}

export interface IUserMusicSetting extends IDynamoMusicBase {
  DataType: "user";
  MusicID: string;
  UserID: string;
  favorite: boolean;
  skip: boolean;
  memo: string;
}
