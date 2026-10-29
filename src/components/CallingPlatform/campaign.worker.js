import { simulateConversation } from "./demoPlatform.js";

const cancelledCampaigns = new Set();
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

self.onmessage = async event => {
  const message = event.data;
  if (message?.type === "cancel") {
    cancelledCampaigns.add(message.campaignId);
    return;
  }
  if (message?.type !== "run") return;

  const { campaignId, contacts, agent } = message;
  cancelledCampaigns.delete(campaignId);
  self.postMessage({ type: "started", campaignId, total: contacts.length });

  for (const [index, contact] of contacts.entries()) {
    if (cancelledCampaigns.has(campaignId)) {
      cancelledCampaigns.delete(campaignId);
      self.postMessage({ type: "cancelled", campaignId });
      return;
    }
    const result = simulateConversation(contact, agent, index, campaignId);
    self.postMessage({ type: "result", campaignId, result, completed: index + 1 });
    await wait(180);
  }

  self.postMessage({ type: "complete", campaignId });
};
