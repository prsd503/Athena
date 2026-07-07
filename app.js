import { initializeApp } from "https://console.firebase.google.com/";
import { getAuth } from "https://console.firebase.google.com/";
import { getFirestore } from "https://console.firebase.google.com/";

const firebaseConfig = {
    apiKey: "AIzaSyBEYKHQpy_VjmgjYiWQQPjXth1bghYsf9M",
    authDomain: "https://console.firebase.google.com/",
    projectId: "finder-owl",
    storageBucket: "finder-owl.appspot.com",
    appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
