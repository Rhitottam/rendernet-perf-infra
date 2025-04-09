
const feedData = require('./mock-feed-data.json');

export const mockFeedData = feedData;

const getMockFeedDataByCount = (count) => {
  let mediaCount = 0;
  let generationCount = 0;
  const data = [];
  (mockFeedData.data ?? []).forEach((generation) => {
    if (mediaCount < count) {
      generationCount += 1;
      mediaCount += generation.media.length;
      data.push(generation);
    }
  });
  return {
    ...mockFeedData,
    data,
    pagination: {
      ...mockFeedData.pagination,
      page_size: generationCount,
    },
  };
};
export const mockFeedData50 = getMockFeedDataByCount(50);
export const mockFeedData100 = getMockFeedDataByCount(100);
export const mockFeedData500 = getMockFeedDataByCount(500);
export const mockFeedData1000 = getMockFeedDataByCount(1000);
export const mockFeedData1500 = getMockFeedDataByCount(1500);
export const mockFeedData0 = { data: [], err: {}, pagination: {} };

export const mockCanvasId = feedData.data[0].canvas_id;

const mockCanvasData = {
  canvas_id: mockCanvasId,
  image_url:
    'https://redernet-image-data.s3.amazonaws.com/stg/user_generated/images/usr_Qa6MYVytuP/img_XZPijdkoQ9.webp',
  name: 'Testing Canvas',
  position: {
    x: 2720,
    y: 430,
  },
  public: true,
  scale: {
    x: 0.1,
    y: 0.1,
  },
  status: 'active',
  updated_at: 1734941062,
};

export const mockCanvasListData = {
  data: [mockCanvasData],
  pagination: {
    page: 1,
    page_size: 1,
    total: 1,
  },
  err: {},
};

export const mockCanvasDetailsData = {
  data: mockCanvasData,
  err: {},
};

const mockCanvasFeed = (feedDataItems) => {
  const feed = [];
  const mockFeed = feedDataItems.data;
  let row = 0;
  let col = 0;
  const rowLimit = 30;
  const rowHeight = 300;
  const gap = 10;
  let current = [0, 0];
  for (let i = 0; i < mockFeed.length; i += 1) {
    const generation = mockFeed[i];
    const media = [];
    for (let j = 0; j < generation.media.length; j += 1) {
      const asset = generation.media[j];
      if (col > rowLimit) {
        row += 1;
        col = 0;
        current = [0, row * (rowHeight + gap)];
      }
      const mediaWidth = asset.metadata.dim.width * (rowHeight / asset.metadata.dim.height);
      media.push({
        ...asset,
        properties: {
          position: {
            x: current[0],
            y: current[1],
          },
          scale: {
            height: 300,
            width: mediaWidth,
          },
        },
      });
      col += 1;
      current[0] += mediaWidth + gap;
    }
    generation.media = media;
    feed.push(generation);
  }
  return {
    data: feed,
    pagination: {
      page: 1,
      page_size: 500,
      total: 500,
    },
    err: {},
  };
};
export const mockCanvasFeedData0 = mockCanvasFeed(mockFeedData0);
export const mockCanvasFeedData50 = mockCanvasFeed(mockFeedData50);
export const mockCanvasFeedData100 = mockCanvasFeed(mockFeedData100);
export const mockCanvasFeedData500 = mockCanvasFeed(mockFeedData500);
export const mockCanvasFeedData1000 = mockCanvasFeed(mockFeedData1000);
export const mockCanvasFeedData1500 = mockCanvasFeed(mockFeedData1500);


const getStudioFeedAccordingToSize = (size) => {
  switch (size) {
    case 0:
      return mockFeedData0;
    case 50:
      return mockFeedData50;
    case 100:
      return mockFeedData100;
    case 500:
      return mockFeedData500;
    case 1000:
      return mockFeedData1000;
    case 1500:
      return mockFeedData1500;
    default:
      return mockFeedData500;
  }
};

module.exports = {
  getStudioFeedAccordingToSize
};