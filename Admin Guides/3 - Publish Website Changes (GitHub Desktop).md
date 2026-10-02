# Guide 3: Publish Website Changes (GitHub Desktop)

**What this does:** sends the changes in the SEPALibrary folder on your Mac to the live
website, sepalibrary.org. Nothing changes online until you do this.

## Steps

1. Open **GitHub Desktop**. At the top it should say **Current Repository: SEPALibrary**.
2. On the left, under **Changes**, you'll see the list of changed files. Leave them all checked.
3. At the bottom left, click the **Summary (required)** box and type a short label,
   for example `Version 0.6 forums` or `Updated button pictures`.
4. Click the blue **Commit ... to main** button.
5. At the top right, click **Push origin**.
6. Wait 1 to 2 minutes, then open **sepalibrary.org** and press **Cmd + Shift + R**
   to make sure you see the newest version.

## If something looks wrong

- **The site looks broken or old:** press **Cmd + Shift + R**. If it still looks wrong,
  wait 5 minutes and try again. GitHub can take a few minutes to update.
- **Push origin is greyed out or shows an error:** take a screenshot and send it to Claude.
- **To undo a change:** in GitHub Desktop, click **History**, right-click the change, and
  choose **Revert changes in commit**, then Push origin. Every past version is kept.

## Using VS Code instead

VS Code works too: click the **Source Control** icon on the left (it has a number badge),
type the label in the message box, click **Commit** (choose **Always** if asked to stage),
then **Sync Changes**.
