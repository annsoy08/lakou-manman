import test from "node:test";
import assert from "node:assert/strict";
import {
  getAppShellRedirectTarget,
  profileNeedsOnboarding,
} from "../src/lib/app-shell-routing.mjs";

const authenticatedUser = {
  uid: "user-1",
  displayName: "Manman",
};

const completeProfile = {
  name: "Manman",
  city: "Montréal",
  childAges: "3 ans",
  interests: ["Alimentation"],
  onboardingCompletedAt: "2026-03-18T20:00:00.000Z",
};

test("profileNeedsOnboarding returns false for completed onboarding", () => {
  assert.equal(profileNeedsOnboarding(completeProfile, authenticatedUser), false);
});

test("profileNeedsOnboarding returns true for incomplete profile", () => {
  assert.equal(
    profileNeedsOnboarding(
      {
        name: "Manman",
        city: "",
        childAges: "",
        interests: [],
      },
      authenticatedUser
    ),
    true
  );
});

test("unauthenticated users are redirected away from protected routes", () => {
  assert.equal(
    getAppShellRedirectTarget({ pathname: "/feed", user: null, userProfile: null, authLoading: false }),
    "/"
  );
});

test("authenticated users with completed onboarding can stay on home page", () => {
  assert.equal(
    getAppShellRedirectTarget({
      pathname: "/",
      user: authenticatedUser,
      userProfile: completeProfile,
      authLoading: false,
    }),
    null
  );
});

test("authenticated users with incomplete onboarding are redirected from home to onboarding", () => {
  assert.equal(
    getAppShellRedirectTarget({
      pathname: "/",
      user: authenticatedUser,
      userProfile: {
        name: "Manman",
        city: "",
        childAges: "",
        interests: [],
      },
      authLoading: false,
    }),
    "/onboarding"
  );
});

test("authenticated users do not stay on login after onboarding", () => {
  assert.equal(
    getAppShellRedirectTarget({
      pathname: "/login",
      user: authenticatedUser,
      userProfile: completeProfile,
      authLoading: false,
    }),
    "/feed"
  );
});

test("completed users are redirected out of onboarding", () => {
  assert.equal(
    getAppShellRedirectTarget({
      pathname: "/onboarding",
      user: authenticatedUser,
      userProfile: completeProfile,
      authLoading: false,
    }),
    "/feed"
  );
});
