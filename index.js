const core = require("@actions/core");
const { Client } = require("@notionhq/client");

require("dotenv").config();

const SUPPORTED_PROPERTY_TYPES = {
  RICH_TEXT: "rich_text",
  MULTI_SELECT: "multi_select",
};

const SUPPORTED_EXISTING_VALUE_ACTIONS = {
  OVERWRITE: "overwrite",
  APPEND: "append",
};

const generateUpdateProps = (
  propertyType,
  existingValueAction,
  propertyName,
  newValue,
  pageDetails
) => {
  if (propertyType === SUPPORTED_PROPERTY_TYPES.MULTI_SELECT) {
    const selectValues = pageDetails.properties[propertyName].multi_select;
    selectValues.push({ name: newValue });

    return {
      multi_select: selectValues,
    };
  }

  if (existingValueAction === SUPPORTED_EXISTING_VALUE_ACTIONS.OVERWRITE) {
    return {
      rich_text: [{ type: "text", text: { content: newValue } }],
    };
  }

  const richTextValues = pageDetails.properties[propertyName].rich_text;
  richTextValues.push(newValue);

  return {
    rich_text: [{ type: "text", text: { content: richTextValues.join(",") } }],
  };
};

const updateNotionStory = async (
  notionKey,
  notionPageId,
  propertyName,
  value,
  propertyType,
  existingValueAction
) => {
  const notion = new Client({ auth: notionKey });

  const pageDetails = await notion.pages.retrieve({ page_id: notionPageId });

  const updateProps = generateUpdateProps(
    propertyType,
    existingValueAction,
    propertyName,
    value,
    pageDetails
  );

  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      [propertyName]: updateProps,
    },
  });
};

const getConfig = () => {
  const isOffline = process.env.NODE_ENV === "offline";
  if (isOffline) {
    return {
      notionKey: process.env.NOTION_KEY,
      notionPageId: process.env.NOTION_PAGE_ID,
      notionPropertyName: process.env.NOTION_PROPERTY_NAME,
      notionPropertyType:
        process.env.NOTION_PROPERTY_TYPE || SUPPORTED_PROPERTY_TYPES.RICH_TEXT,
      notionUpdateValue: process.env.NOTION_UPDATE_VALUE,
      existingValueAction:
        process.env.EXISTING_VALUE ||
        SUPPORTED_EXISTING_VALUE_ACTIONS.OVERWRITE,
    };
  }
  return {
    notionKey: core.getInput("notion-key"),
    notionPageId: core.getInput("notion-page-id"),
    notionPropertyName: core.getInput("notion-property-name"),
    notionPropertyType:
      core.getInput("notion-property-type") ||
      SUPPORTED_PROPERTY_TYPES.RICH_TEXT,
    notionUpdateValue: core.getInput("notion-update-value"),
    existingValueAction:
      core.getInput("existing-value") ||
      SUPPORTED_EXISTING_VALUE_ACTIONS.OVERWRITE,
  };
};

const run = async () => {
  const {
    notionKey,
    notionPageId,
    notionPropertyName,
    notionPropertyType,
    notionUpdateValue,
    existingValueAction,
  } = getConfig();

  if (
    !SUPPORTED_PROPERTY_TYPES.hasOwnProperty(notionPropertyType.toUpperCase())
  ) {
    core.setFailed(
      `Type of Notion Page property ${notionPropertyType} is not supported.`
    );
  }

  try {
    await updateNotionStory(
      notionKey,
      notionPageId,
      notionPropertyName,
      notionUpdateValue,
      notionPropertyType,
      existingValueAction
    );
  } catch (error) {
    core.setFailed(`Error updating Notion page ${notionPageId}: ${error}`);
  }

  console.info(
    `Updated Notion page ${notionPageId} | ${notionPropertyName}: ${notionUpdateValue}`
  );
};

run();
