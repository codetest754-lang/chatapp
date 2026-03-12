import * as signalR from '@microsoft/signalr';

export const chatConnection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/chat')
  .withAutomaticReconnect()
  .build();

export const callConnection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/call')
  .withAutomaticReconnect()
  .build();
