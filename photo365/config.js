// ─── Photo365 settings ─────────────────────────────────────────────
// Edit these values once when you set the site up. See README.md.
window.P365_CONFIG = {
  title: "Photo365",

  // Day 1 of the challenge, as "YYYY-MM-DD".
  // Anything you post before this date is labeled "Practice": it shows on
  // the site but doesn't count toward the 365.
  // Set to null to make your first photo Day 1.
  startDate: "2027-01-01",

  // Length of the challenge in days.
  days: 365,

  // Your Cloudinary "cloud name" (Cloudinary dashboard, top left).
  cloudName: "YOUR_CLOUD_NAME",

  // The GitHub repo this site lives in. The upload page saves captions
  // and posts to entries.json in this repo.
  github: {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "YOUR_GITHUB_USERNAME.github.io",
    branch: "main",
    path: "photo365/entries.json"
  }
};
