exports.getContentCalendarPrompt = ({ businessName, industry, targetAudience, campaignGoal, brandDnaPrefix = '' }) => `${brandDnaPrefix}You are a senior marketing strategist for a small business agency.

Client: ${businessName}
Industry: ${industry}
Target Audience: ${targetAudience}
Campaign Goal: ${campaignGoal}

Generate a 30-day content calendar. Align content types with platform best practices:
- Instagram: reels, carousels, stories
- Facebook: video, text posts
- TikTok: trends, viral formats

Requirements:
- 10% evergreen content, 30% audience-engagement posts
- Visual descriptions clear enough for a designer
- Platform-specific hashtags, 8-12 per post
- CTAs that drive specific actions based on the campaign goal

Return ONLY a JSON object matching this exact schema (no markdown, no extra text):
{
  "calendarTitle": "string",
  "month": "string (e.g. May 2026)",
  "posts": [
    {
      "day": 1,
      "platform": "Instagram | Facebook | TikTok",
      "contentType": "Reel | Carousel | Story | Post | Script",
      "topic": "string",
      "caption": "string (ready-to-post)",
      "visualDescription": "string (designer brief)",
      "hashtags": ["string"],
      "cta": "string",
      "scheduledTime": "string (e.g. 10:00 AM)",
      "isEvergreen": false
    }
  ],
  "summary": {
    "totalPosts": 30,
    "platformBreakdown": { "Instagram": 0, "Facebook": 0, "TikTok": 0 },
    "evergreenCount": 0,
    "engagementCount": 0
  }
}`;

exports.getInstagramCaptionPrompt = ({ targetAudience, topic, tone }) => `Craft a highly-engaging Instagram caption for ${targetAudience} about ${topic} in ${tone} voice.

Requirements:
- First line must grab attention immediately
- Include 5-8 relevant hashtags (popular, niche, and location-based)
- Clear, specific CTA aligned to business goals
- Under 200 characters for maximum impact
- 1-2 emojis for emotional resonance
- Suggest optimal post timing based on audience demographics

Return ONLY a JSON object:
{
  "caption": "string (full ready-to-post caption with hashtags)",
  "hashtags": ["string"],
  "cta": "string",
  "optimalPostTime": "string",
  "engagementPrediction": "Low | Medium | High"
}`;

exports.getFacebookPostPrompt = ({ targetAudience, topic }) => `Write a compelling Facebook post for ${targetAudience} about ${topic}.

Requirements:
- Intriguing hook question or statement at start
- Short paragraphs of 1-3 sentences max
- Primary and secondary call-to-action
- Suggest optimal image/video format
- Text under 80% density for readability

Return ONLY a JSON object:
{
  "postText": "string",
  "primaryCTA": "string",
  "secondaryCTA": "string",
  "recommendedMediaFormat": "Image | Video | Carousel | None",
  "mediaDescription": "string"
}`;

exports.getTikTokScriptPrompt = ({ topic }) => `Create an engaging TikTok script about ${topic}.

Structure:
- HOOK (first 3 seconds): Attention-grabbing opening with action/visual suggestion
- MAIN CONTENT (55 sec max): 2-4 scenes with transitions, 1 trend reference, 2 natural product/service mentions, 2 text overlay placements
- CTA (last 2 seconds): Clear action with visual cue
- AUDIO: 3 trending sound recommendations
- TEXT: 5 on-screen text phrases with position

Return ONLY a JSON object:
{
  "hook": "string",
  "scenes": [
    {
      "duration": "string (e.g. 10s)",
      "script": "string",
      "visualDirection": "string",
      "textOverlay": "string | null"
    }
  ],
  "cta": "string",
  "trendingSounds": ["string"],
  "onScreenText": [
    { "text": "string", "position": "Top | Center | Bottom", "timing": "string" }
  ]
}`;

exports.getWeeklyReportPrompt = ({ clientName }) => `Analyze social media performance for ${clientName} across all platforms.

Return ONLY a JSON object:
{
  "clientName": "${clientName}",
  "reportPeriod": "string (e.g. Week of May 5-11, 2026)",
  "summary": "string (high-level performance vs goals)",
  "topPerformer": {
    "postDescription": "string",
    "platform": "string",
    "metric": "string",
    "reasonForSuccess": "string"
  },
  "insights": [
    { "pattern": "string", "recommendation": "string" }
  ],
  "nextWeekActions": ["string"],
  "sentimentScore": 7,
  "sentimentJustification": "string"
}`;
