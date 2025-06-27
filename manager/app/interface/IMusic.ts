export interface IMusic {
  music_common_id: string;      // Music共通情報のUUID
  user_music_setting_id: string; // UserMusicSettingのUUID
  music_id: string;             // 楽曲固有ID（外部サービスID等）
  title: string;
  favorite: boolean;
  skip: boolean;
  memo: string;
}
