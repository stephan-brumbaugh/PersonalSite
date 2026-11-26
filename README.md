# Stephan's site + Photo365

A personal site (home, interests, resume) with a Photo365 section: a calendar, a day-by-day 365 grid, and a gallery. You post from your phone through an installable app page.

**Where things live**

| What | Where | Why |
|---|---|---|
| The site (HTML, CSS, JS) | GitHub Pages | Free, simple |
| Photos | Cloudinary (free plan) | Keeps big files out of GitHub, makes thumbnails automatically |
| Captions and posts | `photo365/entries.json` in your repo | Small text file, saved by the upload page |

Your phone shrinks each photo to 2560 px on the long side (about 1 MB) before uploading, so a full year is roughly 400 MB, well inside Cloudinary's free plan.

---

## 1. Put the site on GitHub Pages

1. Create a GitHub account if you don't have one.
2. Create a **public** repository named exactly `YOUR-USERNAME.github.io`.
3. Upload everything in this folder to it (on github.com: **Add file → Upload files**, drag the whole folder contents in, commit). Include the hidden `.nojekyll` file if you can; it's optional.
4. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
5. After a minute your site is at `https://YOUR-USERNAME.github.io`.

## 2. Set up Cloudinary

1. Sign up at cloudinary.com (free plan).
2. On the dashboard, copy your **Cloud name**.
3. Go to **Settings (gear) → Upload → Upload presets → Add upload preset**:
   - **Signing mode:** Unsigned
   - **Asset folder** (or **Folder**): `photo365`
   - Optional but recommended: under limits, set allowed formats to `jpg,png,heic,webp` and a max file size of 20 MB.
   - Save, then copy the **preset name** (it looks like `ab12cd34`). Treat it like a password: it isn't published on your site, it's only stored on your phone.

## 3. Create a GitHub token for uploading

The upload page saves captions to `entries.json` through the GitHub API, so it needs a token that can write to *this one repo only*.

1. github.com → your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** Only select repositories → `YOUR-USERNAME.github.io`.
3. **Permissions → Repository permissions → Contents:** Read and write. Nothing else.
4. Expiration: up to 1 year (put a reminder in your calendar to renew it).
5. Copy the token (starts with `github_pat_`).

## 4. Edit `photo365/config.js`

Fill in `cloudName`, your GitHub `owner` and `repo`, then commit the change.

`startDate` is already set to `"2027-01-01"`, so that's Day 1.

### Practice before Day 1

Anything you post before January 1 counts as **practice**:

- It shows on the calendar and in the gallery with a "Practice" label.
- It appears in its own section above the 365 grid.
- Your day streak includes practice days.
- Practice photos don't count toward the 365. Missed practice days aren't flagged.
- Until Day 1, the header counts down the days and shows how many practice shots you've taken.
- Once there are both kinds, the gallery gets a filter: All, The 365, or Practice.

## 5. Install it on your phone

Open `https://YOUR-USERNAME.github.io/photo365/add.html` on your phone.

- **iPhone (Safari):** Share button → **Add to Home Screen**. Open the new Photo365 icon, then enter your settings *inside the installed app* (iPhone keeps the app's storage separate from Safari).
- **Android (Chrome):** you'll be offered **Install app**, or use ⋮ → **Add to Home screen / Install app**. Bonus: once installed, Photo365 shows up in the **Share** menu from Google Photos or your gallery, so you can share a photo straight into a new entry.

On first open you'll see **Set up uploading**: enter the Cloudinary cloud name, upload preset, GitHub username, repo, and token. Tap **Save and test**. These stay on that device only.

Long-press the app icon (Android) for an **Add today's photo** shortcut.

## Daily use

1. Open Photo365 and tap **+** (only you see it, because only your phone has the token).
2. Choose or take a photo. The date defaults to today; change it to fill in a missed day.
3. Optional: add a caption. Turn on **Add a post** if you want to write more. Posts support simple formatting: `**bold**`, `*italic*`, `[link](https://…)`, `## heading`, `- lists`, `> quotes`.
4. Tap **Publish**. It appears on your phone right away and on the public site within about a minute (GitHub Pages rebuilds).

To edit a day: open it on the site and tap the pencil, or tap it under **Recent** on the upload page. Missed days are listed so you can catch up. Drafts are kept if you close the app mid-sentence.

Removing an entry takes it off the site but leaves the photo in Cloudinary; delete it in the Cloudinary Media Library if you want it gone.

## Customizing

- Home page text, interests, contact links: `index.html` (look for `EDIT` comments).
- Resume: `resume.html`. Visitors can tap **Save as PDF** to get a clean printable copy.
- Colors and fonts: the `:root` block at the top of `assets/site.css`.

## Files

```
index.html, resume.html      Main site pages
assets/site.css              Shared styles
photo365/index.html, app.js  Calendar, 365 grid, gallery, day view
photo365/add.html, admin.js  Upload page (the phone app)
photo365/common.js           Shared helpers
photo365/config.js           Your settings
photo365/entries.json        Your captions and posts (written by the upload page)
photo365/sw.js, manifest     Make it installable and work offline
```

## Troubleshooting

- **"Photo upload failed: Upload preset not found"**: the preset name is wrong, or the preset isn't set to Unsigned.
- **"Bad credentials" / 401**: the GitHub token expired or was mistyped. Settings (gear icon) → paste a new one.
- **"Repo not found"**: check the repo name and that the token was given access to that repo.
- **New photo not showing for visitors**: wait a minute for GitHub Pages; it shows on your own phone immediately.
