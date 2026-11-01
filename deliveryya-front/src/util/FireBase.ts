// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import axiosInstance from "./AxiosUtil";
import { swalAlert } from "./SwalUtil";
import { useNavigate } from "react-router-dom";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCYohOuEAVgh0vxpXzXshnLhva7BQ1ui4w",
    authDomain: "deliveryya-3b144.firebaseapp.com",
    projectId: "deliveryya-3b144",
    storageBucket: "deliveryya-3b144.firebasestorage.app",
    messagingSenderId: "961091411423",
    appId: "1:961091411423:web:4cbde151ba376c7697f86a",
    measurementId: "G-Y7NJBE9XKS"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const messaging = getMessaging(app);
