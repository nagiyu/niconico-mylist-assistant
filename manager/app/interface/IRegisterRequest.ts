export interface IRegisterRequest {
  email: string;
  password: string;
  id_list: string[];
  subscription?: string | null;
  title?: string;
}
