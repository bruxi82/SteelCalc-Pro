import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALU1YfHjjve-j1GPaL7097i51LWi1sVf4",
  authDomain: "steelcalc-pro-574a5.firebaseapp.com",
  projectId: "steelcalc-pro-574a5",
  storageBucket: "steelcalc-pro-574a5.firebasestorage.app",
  messagingSenderId: "648977443919",
  appId: "1:648977443919:web:2e7af26e77c3090412ce3a"
};

// ინიციალიზაცია
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ფუნქცია, რომელიც ბაზიდან ფასს წამოიღებს
export async function getPrice() {
    const docRef = doc(db, "settings", "prices");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data().płyta10cm; // აქ ვიღებთ ზუსტად იმ სახელს, რაც ბაზაში დაარქვი
    } else {
        console.log("მონაცემები ვერ მოიძებნა!");
        return 120; // სათადარიგო ფასი, თუ ბაზამ არ იმუშავა
    }
}