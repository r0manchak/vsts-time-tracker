import * as azdev from "azure-devops-node-api";

export const authHandler = azdev.getPersonalAccessTokenHandler(process.env.AZURE_TOKEN);
export const connection = new azdev.WebApi(process.env.AZURE_URL, authHandler);

let myId: string;

export async function getMyId(): Promise<string> {
  if (myId) {
    return myId;
  }
  // todo: fetch correct id for authenticated user
  myId = process.env.AZURE_MY_ID;
  return myId;
}
