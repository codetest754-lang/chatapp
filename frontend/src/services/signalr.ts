import * as signalR from '@microsoft/signalr';

const withUserId = (baseUrl: string, userId?: string) => {
  if (!userId) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}userId=${encodeURIComponent(userId)}`;
};

export const createChatConnection = (token?: string, userId?: string) =>
  new signalR.HubConnectionBuilder()
    .withUrl(withUserId('/hubs/chat', userId), {
      accessTokenFactory: () => token ?? ''
    })
    .withAutomaticReconnect()
    .build();

export const createCallConnection = (token?: string, userId?: string) =>
  new signalR.HubConnectionBuilder()
    .withUrl(withUserId('/hubs/call', userId), {
      accessTokenFactory: () => token ?? ''
    })
    .withAutomaticReconnect()
    .build();
