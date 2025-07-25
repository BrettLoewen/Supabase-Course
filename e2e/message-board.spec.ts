import test, { expect, Page } from "@playwright/test";
import {
  createComment,
  createPost,
  login,
  setupE2eTest,
  signUp,
} from "./utils";

const testUserEmail = "test@test.io";
const testUserPassword = "test123567";
const testUserName = "test";

test.describe("Message Board", () => {
  test.beforeEach(setupE2eTest);

  test.beforeEach(async ({ page }) => {
    page.goto("http://localhost:1337");
  });

  test.describe("not logged in", () => {
    test("can see message board, but cannot interact", async ({ page }) => {
      const messageBoardSignIn = page.locator(
        `[data-e2e="message-board-login"]`
      );
      const createPostForm = page.locator(`[data-e2e="create-post-form"]`);
      await expect(messageBoardSignIn).toHaveCount(1);
      await expect(createPostForm).toHaveCount(0);
    });
    test("can see posts on the message board, but cannot interact", async ({
      page,
      browser,
    }) => {
      const otherUser = await browser.newPage();
      await otherUser.goto("http://localhost:1337");
      await signUp(otherUser, testUserEmail, testUserPassword, testUserName);
      const post = await createPost(otherUser, "test post", "test contents");
      await post.click();
      await createComment(otherUser, "test comment");
      await page.goto("http://localhost:1337/1");
      const messageBoardSignIn = page.locator(
        `[data-e2e="message-board-login"]`
      );
      const createPostForm = page.locator(`[data-e2e="create-post-form"]`);
      await expect(messageBoardSignIn).toHaveCount(1);
      await expect(createPostForm).toHaveCount(0);
      const postViaNotLoggedInUser = page.locator("h3", {
        hasText: "test post",
      });
      await postViaNotLoggedInUser.click();
      const postContent = page.locator(`[data-e2e="post-content"]`, {
        hasText: "test contents",
      });
      await expect(postContent).toHaveCount(1);
      const commentContent = page.locator(`[data-e2e="comment-content"]`, {
        hasText: "test comment",
      });
      await expect(commentContent).toHaveCount(1);
      const commentForm = page.locator(`[data-e2e="create-comment-form"]`);
      await expect(commentForm).toHaveCount(0);
      const upvotes = page.locator(`[data-e2e="upvote"]`);
      await expect(upvotes).toHaveCount(2);
      const downvotes = page.locator(`[data-e2e="downvote"]`);
      await expect(downvotes).toHaveCount(2);
      const replyButton = page.locator(`button`, { hasText: "Reply" });
      await expect(replyButton).toHaveCount(1);
      await expect(replyButton).toBeDisabled();
      for (let i = 0; i < 2; i++) {
        await expect(upvotes.nth(i)).toBeDisabled();
        await expect(downvotes.nth(i)).toBeDisabled();
      }
    });
    test("signing up from the message board sends you back to the message board", async ({
      page,
    }) => {
      await signUp(page, testUserEmail, testUserPassword, testUserName);
      await page.goto("http://localhost:1337/1");
      const messageBoardTitle = page.locator("h2", {
        hasText: "Message Board",
      });
      await expect(messageBoardTitle).toHaveCount(1);
      const createPostForm = page.locator(`[data-e2e="create-post-form"]`);
      await expect(createPostForm).toHaveCount(1);
    });
    test("logging in from a post message board sends you back to that post", async ({
      page,
    }) => {
      await signUp(page, testUserEmail, testUserPassword, testUserName);
      const post = await createPost(page, "test post", "test contents");
      const logoutButton = page
        .locator("button", { hasText: "Logout" })
        .first();
      await logoutButton.click();
      await post.click();
      const postContent = page.locator(`[data-e2e="post-content"]`, {
        hasText: "test contents",
      });
      await expect(postContent).toHaveCount(1);
      const postUrl = page.url();
      await login(
        page,
        testUserEmail,
        testUserPassword,
        testUserName,
        `[data-e2e="message-board-login"] button`
      );
      expect(page.url()).toBe(postUrl);
      await expect(postContent).toHaveCount(1);
    });
  });

  test.describe("signed in user", () => {
    test.beforeEach(async ({ page }) => {
      await signUp(page, testUserEmail, testUserPassword, testUserName);
    });

    test("can get to message board", async ({ page }) => {
      const messageBoardLink = page.locator("a", { hasText: "Message Board" });
      await messageBoardLink.click();
      const messageBoardHeader = page.locator("h2", {
        hasText: "Message Board",
      });
      await expect(messageBoardHeader).toHaveCount(1);
    });

    test("can create a new post", async ({ page }) => {
      await createPost(page, "Test Post", "This is a test post");
      const postedByMessage = page.locator("p", {
        hasText: `Posted by ${testUserName}`,
      });
      await expect(postedByMessage).toHaveCount(1);
      //   const commentCount = page.locator("p", { hasText: "comments" });
      //   await expect(commentCount).toHaveText("0 comments");
    });

    test("can create a new top level comment", async ({ page }) => {
      const post = await createPost(page, "Test Post", "This is a test post");
      await post.click();
      await createComment(page, "This is a test comment");
      const textArea = page.locator(`textarea`);
      await expect(textArea).toHaveValue("");
      //   const commentCount = page.locator("p", { hasText: "comments" });
      //   await expect(commentCount).toHaveText("1 comments");
    });

    test("nested comment form closes after comment is posted", async ({
      page,
    }) => {
      const post = await createPost(page, "Test Post", "This is a test post");
      await post.click();
      await createComment(page, "This is a test comment");
      const replyButton = page.locator(`button`, { hasText: "Reply" });
      await replyButton.click();
      const commentForms = page.locator(`[data-e2e="create-comment-form"]`);
      await expect(commentForms).toHaveCount(2);
      const nestedCommentForm = commentForms.nth(1);
      await nestedCommentForm
        .locator("textarea")
        .fill("This is a nested comment");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Space");
      const postedComment = page.locator(`[data-e2e="comment-content"]`, {
        hasText: "This is a nested comment",
      });
      await expect(postedComment).toHaveCount(1);
      await expect(commentForms).toHaveCount(1);
    });
  });
});