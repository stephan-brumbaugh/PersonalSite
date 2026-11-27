# Stephan's site + Photo365

Setup takes about 30 minutes, done once. You'll make two free accounts, change one file, and set up your phone.

**How it fits together**

- **GitHub Pages** hosts the site itself.
- **Cloudinary** stores the photos, so GitHub doesn't fill up with images.
- **`photo365/entries.json`** in your GitHub repo holds the dates, captions and posts. The upload page on your phone writes to it for you.

**You'll collect four things along the way.** Keep them in a note:

| | Example | From |
|---|---|---|
| Cloudinary cloud name | `dxyz12abc` | Step 2 |
| Cloudinary upload preset name | `p365-k8f2q` | Step 2 |
| GitHub token | `github_pat_11AB…` | Step 3 |
| Your GitHub username | `sbrumbaugh` | Step 1 |

---

## Step 1. Put the site on GitHub

1. Sign in to github.com (or create an account). Your username is the first thing in the note.
2. Click **+** (top right) → **New repository**. Name it exactly **`your-username.github.io`**, set it to **Public**, and create it.
3. On the new repo's page, click **uploading an existing file**.
4. Unzip `stephan-site.zip` on your computer. Open the unzipped folder, select **everything inside it**, and drag that into the browser. Don't drag the folder itself, or the whole site ends up one level too deep. Click **Commit changes**.
5. **Check:** the repo's main page should list `index.html`, `resume.html`, `assets` and `photo365` at the top level. If you instead see a single folder, the site is one level deep; see *"My site is inside a folder"* below.
6. Go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
7. Wait a minute or two, then open `https://your-username.github.io`.

### Your three addresses

Everything in Photo365 lives inside the `photo365` folder, one level below the home page:

| Page | Address |
|---|---|
| Home | `https://your-username.github.io/` |
| Photo365 | `https://your-username.github.io/photo365/` |
| **Post a photo** (the phone app) | `https://your-username.github.io/photo365/add.html` |

The easy way to find the posting page is to open your Photo365 page and tap **Post a photo** at the very bottom.

### My site is inside a folder, or the repo has a different name

That works too; everything just moves down a level. If the repo is called `website` instead of `your-username.github.io`, the Photo365 page is `https://your-username.github.io/website/photo365/`, and the posting page is that address plus `add.html`.

The setup screen on your phone (Step 5) works out where `entries.json` is from the page's address. If saving ever fails with "Not Found", check that the **Where entries.json is in the repo** box matches the real file path in the repo, starting from the top level, for example `website/photo365/entries.json`.

## Step 2. Set up Cloudinary

Cloudinary rearranges its screens now and then, so labels may be slightly different. You need two things: the **cloud name** and an **unsigned upload preset**.

1. Sign up at cloudinary.com on the free plan. If it asks what you're building, any answer is fine.
2. **Cloud name:** shown on the console's home page, and at the top of **Settings → API Keys**. It's a short code like `dxyz12abc`. You don't need the API key or secret.
3. **Upload preset:** while signed in, go to `https://console.cloudinary.com/app/settings/upload/presets`. You can also get there from **Settings** (gear icon, bottom left) → **Upload Presets**. Click **Add Upload Preset**.
4. On the **General** tab:
   - **Signing mode: Unsigned.** This is the setting that matters.
   - **Upload preset name:** keep the generated name or type something hard to guess.
   - **Folder** (or **Asset folder**): `photo365`. Optional; it just keeps your Media Library tidy.
5. Click **Save**. The preset shows up in the list marked **Unsigned**. Copy its name into your note.

Don't post the preset name anywhere public; it's only stored on your phone.

## Step 3. Make a GitHub token

This lets your phone save captions and posts to the repo. It can only touch this one repo.

1. On github.com: your profile picture → **Settings** → **Developer settings** (bottom of the left menu) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name:** `Photo365 phone`. **Expiration:** pick a date up to a year out and put a reminder in your calendar a week before.
3. **Repository access:** **Only select repositories** → your site repo.
4. **Permissions → Repository permissions → Contents → Read and write.** Leave everything else alone.
5. **Generate token** and copy it right away (it starts with `github_pat_`). GitHub won't show it again.

## Step 4. Edit `photo365/config.js`

Visitors' browsers need your cloud name to load the photos, so it has to be in this file.

1. In your repo, open `photo365` → `config.js` → pencil icon (**Edit**).
2. Change these lines:
   - `cloudName: "YOUR_CLOUD_NAME"` → your cloud name
   - `owner: "YOUR_GITHUB_USERNAME"` → your username
   - `repo: "YOUR_GITHUB_USERNAME.github.io"` → your repo name
   - Only if your site is inside a folder: `path` (see the comment above it)
3. **Commit changes**.

`startDate` is already `"2027-01-01"`. Anything you post before then is a practice shot (see below).

## Step 5. Set up your phone

1. On your phone, open your Photo365 page and tap **Post a photo** at the bottom.
2. Install it:
   - **iPhone:** in Safari, tap **Share** → **Add to Home Screen** → **Add**. Then **open Photo365 from the new home-screen icon** and do step 3 there. iPhone keeps the installed app's storage separate from Safari, so settings entered in Safari won't carry over.
   - **Android:** Chrome offers **Install app**, or use **⋮ → Add to Home screen**. Once it's installed, Photo365 also appears in the **Share** menu from your gallery.
3. The app opens on **Set up uploading**. Fill in your four values from the note. Branch and the entries.json path are filled in for you. Tap **Save and test**.
4. **Check:** it should say **Connected** and switch to the posting screen.

## Every day

1. Open the Photo365 app. It opens to today.
2. Tap the photo box to take or choose a picture.
3. Optionally add a caption. Switch on **Add a post** to write more. Posts take simple formatting: `**bold**`, `*italic*`, `[link text](https://…)`, `## heading`, `- list item`, `> quote`.
4. Tap **Publish**. It shows on your phone right away and for everyone else within about a minute.

Other things you can do:

- **Fix a past day:** open it on the site and tap the pencil, or tap it under **Recent** in the app.
- **Catch up:** missed days are listed in the app; tap one to fill it in.
- **Change a photo:** open that day in the app and pick a new photo.
- **Remove a day:** open it in the app and tap **Remove this day's entry** at the bottom. The photo stays in Cloudinary until you delete it from Cloudinary's Media Library.
- **Drafts:** a half-written caption or post is kept if you close the app.

On your phone only, the Photo365 page also shows a **+** button and empty days you can tap to fill in. Visitors never see those.

## Sharing to Instagram and Facebook

Facebook doesn't let any app post to a personal profile, or fill in the text for you. The simplest setup is to post to Instagram and let Instagram copy it to Facebook.

**One-time setup:** in Instagram, go to **Settings → Accounts Center → Sharing across profiles**, pick your Instagram account, and turn on **Automatically share** to your Facebook profile for posts. Every Instagram post then appears on your Facebook with the same photo and caption. Instagram's menu names change sometimes; look for "sharing across profiles" or "share to Facebook".

**Each time you publish:**

1. The **Share** box appears under the photo. Its caption already has your caption, your blog post, a link to the full post on your site, and the day tag. Edit it if you like.
2. Tap **Share to Instagram**. The caption is copied, and your share menu opens with the photo.
3. Pick Instagram, long-press the caption box, tap **Paste**, and post. It shows up on Facebook too.

Instagram captions are limited to 2,200 characters, so a long post is shortened in the caption. The link takes people to the full post. Links aren't clickable on Instagram itself, but on Facebook they usually are.

**Copy caption** and **Copy link** copy just those, for posting somewhere else.

On a computer there's no share menu, so the button saves the photo to your downloads and copies the caption instead.

Behind the scenes, each published day gets a small page at `photo365/day/DATE.html`. That's the address the link uses. It forwards visitors to that day on the site, and it shows a photo preview when someone pastes the link into Facebook or a text message. It's removed if you remove the day.

## Practice before Day 1

Until January 1, 2027, everything you post is labeled **Practice**:

- Practice shots appear on the calendar and in the gallery, and in their own section above the 365 grid.
- They don't count toward the 365, and skipped practice days aren't marked as missed.
- Your streak does count them.
- The header counts down to Day 1.

To use a different start date, change `startDate` in `photo365/config.js`.

## Editing the rest of the site

- **Home page:** `index.html`. The intro and interest cards are a first draft from your resume, marked with `EDIT` comments. Put your real email and links in the contact section.
- **Resume:** `resume.html`. The **Save as PDF** button prints a clean white version. References aren't on the public page because they include other people's phone numbers and emails.
- **Colors and fonts:** the `:root` block at the top of `assets/site.css`.

To edit any file on github.com: open it, click the pencil, change it, **Commit changes**. The site updates in a minute or two.

## When something goes wrong

| What you see | What to do |
|---|---|
| A 404 page when opening the posting page | The address is missing a level. Open your Photo365 page and use the **Post a photo** link at the bottom. |
| Photos show on your phone but are broken for everyone else | `cloudName` in `photo365/config.js` is still `YOUR_CLOUD_NAME` or has a typo. |
| "Upload preset not found" or "must be whitelisted for unsigned uploads" | The preset name is wrong, or its signing mode isn't **Unsigned**. |
| "Bad credentials" or a 401 error | The GitHub token expired or was mistyped. Tap the gear icon in the app and paste a new one. |
| "Repo not found" | Check the repo name, and that the token was given access to that repo. |
| "Not Found" when publishing, but setup said Connected | The **Where entries.json is in the repo** path is wrong. Tap the gear and fix it. |
| On iPhone, it keeps asking for settings | You entered them in Safari. Open the home-screen icon and enter them there. |
| A new photo isn't showing for others yet | Wait a minute or two while GitHub Pages updates. |

## What's in the folder

```
index.html, resume.html      Home page and resume
assets/site.css              Shared look for every page
photo365/index.html, app.js  Calendar, 365 grid, gallery, single-photo view
photo365/add.html, admin.js  The posting app
photo365/config.js           Your settings
photo365/entries.json        Dates, captions and posts (written by the app)
photo365/common.js           Shared code
photo365/sw.js, manifest     Make it installable on your phone
```
