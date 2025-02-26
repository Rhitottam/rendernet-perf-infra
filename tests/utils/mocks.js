export const mockSuccessTxtToImgGenerateResponse = {
  generation_id: "batch_456",
  credits: 10,
  media: [{
    media_id: "media_456",
    status: "success",
    media_type: "IMAGE",
    generation_type: "txt2img",
    seed: 67890,
    thumbnail: "https://example.com/thumbnail.jpg",
    output: "https://example.com/generated-image.jpg",
    model: {
      name: "stable-diffusion-v1-5",
      display_name: "Stable Diffusion v1.5",
      preview_image: "https://example.com/model-preview.jpg",
      settings: {
        steps: 30,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    style: {
      id: "style_123",
      display_name: "Anime Style",
      preview_image: "https://example.com/style-preview.jpg",
      settings: {
        steps: 30,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    published: false,
    scenes: [], // Optional: Add if you're working with video
    state: {}, // Optional: Add for music video states
  }]
};

// If you need a version with multiple images in the batch:
export const mockSuccessMultipleTxtToImgGenerateResponse = {
  generation_id: "batch_789",
  credits: 20,
  media: [
    {
      media_id: "media_789_1",
      status: "success",
      media_type: "IMAGE",
      generation_type: "txt2img",
      seed: 11111,
      thumbnail: "https://example.com/thumbnail1.jpg",
      output: "https://example.com/generated-image1.jpg",
      model: {
        name: "stable-diffusion-v1-5",
        display_name: "Stable Diffusion v1.5",
        preview_image: "https://example.com/model-preview.jpg",
        settings: {
          steps: 30,
          cfg_scale: 7,
          quality: "standard",
          sampler: "euler_a"
        }
      },
      style: {
        id: "style_123",
        display_name: "Anime Style",
        preview_image: "https://example.com/style-preview.jpg",
        settings: {
          steps: 30,
          cfg_scale: 7,
          quality: "standard",
          sampler: "euler_a"
        }
      },
      published: false
    },
    {
      media_id: "media_789_2",
      status: "success",
      media_type: "IMAGE",
      generation_type: "txt2img",
      seed: 22222,
      thumbnail: "https://example.com/thumbnail2.jpg",
      output: "https://example.com/generated-image2.jpg",
      model: {
        name: "stable-diffusion-v1-5",
        display_name: "Stable Diffusion v1.5",
        preview_image: "https://example.com/model-preview.jpg",
        settings: {
          steps: 30,
          cfg_scale: 7,
          quality: "standard",
          sampler: "euler_a"
        }
      },
      style: {
        id: "style_123",
        display_name: "Anime Style",
        preview_image: "https://example.com/style-preview.jpg",
        settings: {
          steps: 30,
          cfg_scale: 7,
          quality: "standard",
          sampler: "euler_a"
        }
      },
      published: false
    }
  ]
};

export const mockFailedTxtToImgGenerateResponse = {
  generation_id: "batch_123",
  credits: 10,
  media: [{
    media_id: "media_123",
    status: "failed",
    media_type: "IMAGE",
    generation_type: "txt2img",
    seed: 12345,
    thumbnail: null,
    output: null,
    model: {
      name: "stable-diffusion-v1-5",
      display_name: "Stable Diffusion v1.5",
      preview_image: "https://example.com/model-preview.jpg",
      settings: {
        steps: 30,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    style: null,
    published: false
  }]
};

export const mockFailedTxtToVideoGenerateResponse = {
  generation_id: "batch_video_123",
  credits: 50,
  media: [{
    media_id: "video_123",
    status: "failed",
    media_type: "VIDEO",
    generation_type: "txt2vid",
    seed: 12345,
    thumbnail: null,
    output: null,
    model: {
      name: "stable-video-diffusion",
      display_name: "Stable Video Diffusion",
      preview_image: "https://example.com/video-model-preview.jpg",
      settings: {
        steps: 50,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    style: null,
    published: false,
    scenes: [],
    state: {
      current_frame: 0,
      total_frames: 60,
      error_message: "Video generation failed due to server error"
    }
  }]
};

export const mockSuccessTxtToVideoGenerateResponse = {
  generation_id: "batch_video_456",
  credits: 50,
  media: [{
    media_id: "video_456",
    status: "success",
    media_type: "VIDEO",
    generation_type: "txt2vid",
    seed: 67890,
    thumbnail: "https://example.com/video-thumbnail.jpg",
    output: "https://example.com/generated-video.mp4",
    model: {
      name: "stable-video-diffusion",
      display_name: "Stable Video Diffusion",
      preview_image: "https://example.com/video-model-preview.jpg",
      settings: {
        steps: 50,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    style: {
      id: "style_vid_123",
      display_name: "Cinematic Style",
      preview_image: "https://example.com/video-style-preview.jpg",
      settings: {
        steps: 50,
        cfg_scale: 7,
        quality: "standard",
        sampler: "euler_a"
      }
    },
    published: false,
    scenes: [
      {
        frame_start: 0,
        frame_end: 30,
        prompt: "A serene forest scene with sunlight filtering through trees"
      },
      {
        frame_start: 31,
        frame_end: 60,
        prompt: "Camera slowly panning through the forest"
      }
    ],
    state: {
      current_frame: 60,
      total_frames: 60,
      fps: 30,
      duration: 2, // in seconds
      resolution: {
        width: 1024,
        height: 576
      }
    },
    audioDetails: {
      audio_url: "https://example.com/background-music.mp3",
      duration: 2
    }
  }]
};