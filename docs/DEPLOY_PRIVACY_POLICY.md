# Deploying the Privacy Policy for Chrome Web Store

To satisfy the Chrome Web Store requirement for a publicly accessible privacy policy URL, we will use GitHub Pages.

## Deployment Steps

1.  **Commit the `docs/` directory:** Ensure the `docs/` directory containing `privacy.html`, `privacy.css`, and `index.html` is committed to your repository.
    ```bash
    git add docs/
    git commit -m "docs: Prepare privacy policy for GitHub Pages deployment"
    git push origin main
    ```

2.  **Enable GitHub Pages:**
    *   Go to your repository on GitHub.
    *   Navigate to **Settings** > **Pages** (in the left sidebar).
    *   Under **Build and deployment**, select **Deploy from a branch**.
    *   Under **Branch**, select `main` (or your default branch) and choose the `/docs` folder from the dropdown.
    *   Click **Save**.

3.  **Wait for Deployment:**
    *   GitHub will run a workflow to deploy the site. This usually takes 1-2 minutes.
    *   You can check the progress in the **Actions** tab of your repository.

4.  **Get Your URL:**
    *   Once deployed, the Settings > Pages screen will display your public URL (e.g., `https://yourusername.github.io/SilentTube/`).
    *   Because we added an `index.html` that redirects to `privacy.html`, you can use the base URL, or the explicit URL:
        `https://yourusername.github.io/SilentTube/privacy.html`

## Verification Checklist

- [ ] Visit the deployed URL in a browser.
- [ ] Verify the page loads and styles are applied correctly (from `privacy.css`).
- [ ] Copy the exact URL (`.../privacy.html`) to paste into the Chrome Web Store Developer Dashboard.
