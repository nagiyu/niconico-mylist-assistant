export interface IRegisterRequest {
  email: string;
  password: string;
  id_list: string[];
  subscription?: PushSubscription | null;
  title?: string;
}
