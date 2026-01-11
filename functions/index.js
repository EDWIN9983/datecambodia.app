const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/* =========================
   LOG LOGIN (UNCHANGED)
========================= */
exports.logLogin = functions.https.onCall(async (data, context) => {
  console.log("LOG_LOGIN_FUNCTION_CALLED");

  if (!context.auth) {
    console.log("NO AUTH CONTEXT");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User not authenticated"
    );
  }

  const uid = context.auth.uid;
  console.log("AUTH UID:", uid);

  await admin.firestore().collection("loginLogs").add({
    uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "logLogin",
  });

  await admin.firestore().doc(`users/${uid}`).set(
    {
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

/* =========================
   LIKE → INCREMENT likesCount
========================= */
exports.onLikeCreated = functions.firestore
  .document("likes/{likeId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    if (!data) return null;

    const toUser = data.toUser;
    if (!toUser) return null;

    const userRef = admin.firestore().doc(`users/${toUser}`);

    await userRef.set(
      {
        likesCount: admin.firestore.FieldValue.increment(1),
      },
      { merge: true }
    );

    return null;
  });
