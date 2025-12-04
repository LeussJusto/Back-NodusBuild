export interface Attachment {
  url: string;
  type?: string;
  filename?: string;
  size?: number;
}

export interface MessageEntity {
  id: string;
  chatId: string;
  from: string;
  to?: string | null;
  text?: string | null;
  attachments?: Attachment[];
  type?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default MessageEntity;
