import axios from "axios";
import btoa from "btoa";
import core from "@actions/core";
import github from "@actions/github";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const getGitHubRequestHeaders = (username, accessToken) => ({
  headers: { Authorization: `Basic ${btoa(`${username}:${accessToken}`)}` },
});

const updateNotionStory = async (
  notionKey,
  notionPageId,
  propertyName,
  value
) => {
  const notion = new Client({ auth: notionKey });
  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      [propertyName]: {
        rich_text: [{ type: "text", text: { content: value } }],
      },
    },
  });
};

const extractFirstNotionPageId = (prDescription) => {
  const notionURLs = prDescription.match(
    /(https?:\/\/)?(www\.)?notion\.so\/([A-Za-z0-9\-]+)/gi
  );
  if (notionURLs === null || notionURLs.length === 0) {
    return null;
  }
  const firstNotionURLTokens = notionURLs[0].split("/");
  const notionURLPath = firstNotionURLTokens[firstNotionURLTokens.length - 1];
  const notionURLPathTokens = notionURLPath.split("-");
  return notionURLPathTokens[notionURLPathTokens.length - 1];
};

const fetchPRDescription = async (prURL, username, accessToken) => {
  const response = await axios.get(
    prURL,
    getGitHubRequestHeaders(username, accessToken)
  );
  const { body } = response.data;
  return body;
};

const fetchPRURL = async (
  commitHash,
  username,
  accessToken,
  repoOwner,
  repoName
) => {
  const response = await axios.get(
    `https://api.github.com/search/issues?q=hash:${commitHash}`,
    getGitHubRequestHeaders(username, accessToken)
  );
  const { items: issues } = response.data;

  const prURLRegex = new RegExp(
    `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/[0-9]+`
  );
  const { pull_request } = issues.find((issue) =>
    issue.pull_request.url.match(prURLRegex)
  );
  return pull_request.url;
};

const getConfig = () => {
  const isOffline = process.env.NODE_ENV === "offline";
  if (isOffline) {
    return {
      commitHash: process.env.COMMIT_HASH,
      repoOwner: process.env.REPO_OWNER,
      repoName: process.env.REPO_NAME,
      username: process.env.GH_USERNAME,
      accessToken: process.env.GH_ACCESS_TOKEN,
      notionKey: process.env.NOTION_KEY,
      notionPropertyName: process.env.NOTION_PROPERTY_NAME,
      notionUpdateValue: process.env.NOTION_UPDATE_VALUE,
    };
  }
  return {
    commitHash: github.context.sha,
    repoOwner: github.context.repo.owner,
    repoName: github.context.repo.repo,
    username: core.getInput("gh-username"),
    accessToken: core.getInput("gh-token"),
    notionKey: core.getInput("notion-key"),
    notionPropertyName: core.getInput("notion-property-name"),
    notionUpdateValue: core.getInput("notion-update-value"),
  };
};

const run = async () => {
  const {
    commitHash,
    repoOwner,
    repoName,
    username,
    accessToken,
    notionKey,
    notionPropertyName,
    notionUpdateValue,
  } = getConfig();

  let prDescription = "";
  try {
    const prURL = await fetchPRURL(
      commitHash,
      username,
      accessToken,
      repoOwner,
      repoName
    );
    prDescription = await fetchPRDescription(prURL, username, accessToken);
  } catch (error) {
    core.setFailed(
      `Error fetch PR description with hash ${commitHash}: ${error}`
    );
  }

  const notionPageId = extractFirstNotionPageId(prDescription);
  if (notionPageId === null) {
    core.setFailed("No Notion URL found.");
  }

  try {
    await updateNotionStory(
      notionKey,
      notionPageId,
      notionPropertyName,
      notionUpdateValue
    );
  } catch (error) {
    core.setFailed(`Error updating Notion page ${notionPageId}: ${error}`);
  }

  console.info(
    `Updated Notion page ${notionPageId} | ${notionPropertyName}: ${notionUpdateValue}`
  );
};

run();