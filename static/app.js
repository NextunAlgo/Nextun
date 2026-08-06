'use strict';

/* ── DOM references: Views & Toggles ── */
const signupView   = document.getElementById('signup-view');
const loginView    = document.getElementById('login-view');
const brokerView   = document.getElementById('broker-view');
const linkToLogin  = document.getElementById('link-to-login');
const linkToSignup = document.getElementById('link-to-signup');

/* ── DOM references: Signup Form ── */
const emailInput = document.getElementById('email');
const pwInput    = document.getElementById('password');
const cfInput    = document.getElementById('confirm');
const termsCb    = document.getElementById('terms');

const emailErr   = document.getElementById('email-err');
const pwErr      = document.getElementById('pw-err');
const cfErr      = document.getElementById('cf-err');
const termsErr   = document.getElementById('terms-err');
const matchLine  = document.getElementById('match-line');

const eyePwBtn   = document.getElementById('eye-pw');
const eyeCfBtn   = document.getElementById('eye-cf');
const eyePwOff   = document.getElementById('eye-pw-off');
const eyePwOn    = document.getElementById('eye-pw-on');
const eyeCfOff   = document.getElementById('eye-cf-off');
const eyeCfOn    = document.getElementById('eye-cf-on');

const form       = document.getElementById('signup-form');
const btnNext    = document.getElementById('btn-next');
const btnLbl     = document.getElementById('btn-lbl');
const btnSpin    = document.getElementById('btn-spin');
const formCard   = document.getElementById('form-card');

/* ── DOM references: Login Form ── */
const loginForm      = document.getElementById('login-form');
const loginEmail     = document.getElementById('login-email');
const loginPw        = document.getElementById('login-password');
const loginEmailErr  = document.getElementById('login-email-err');
const loginPwErr     = document.getElementById('login-pw-err');

const loginEyePw     = document.getElementById('login-eye-pw');
const loginEyePwOff  = document.getElementById('login-eye-pw-off');
const loginEyePwOn   = document.getElementById('login-eye-pw-on');

const loginBtnNext   = document.getElementById('login-btn-next');
const loginBtnLbl    = document.getElementById('login-btn-lbl');
const loginBtnSpin   = document.getElementById('login-btn-spin');

/* ── DOM references: Forgot Password ── */
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const closeForgotPassword = document.getElementById('close-forgot-password');
const forgotEmail = document.getElementById('forgot-email');
const forgotEmailErr = document.getElementById('forgot-email-err');
const forgotPasswordError = document.getElementById('forgot-password-error');
const sendForgotPasswordOtpBtn = document.getElementById('send-forgot-password-otp-btn');
const sendForgotPasswordOtpText = document.getElementById('send-forgot-password-otp-text');
const sendForgotPasswordOtpLoader = document.getElementById('send-forgot-password-otp-loader');
const forgotPasswordOtpModal = document.getElementById('forgot-password-otp-modal');
const closeForgotPasswordOtp = document.getElementById('close-forgot-password-otp');
const forgotPasswordOtpError = document.getElementById('forgot-password-otp-error');
const verifyForgotPasswordOtpBtn = document.getElementById('verify-forgot-password-otp-btn');
const verifyForgotPasswordOtpText = document.getElementById('verify-forgot-password-otp-text');
const verifyForgotPasswordOtpLoader = document.getElementById('verify-forgot-password-otp-loader');
const resetPasswordModal = document.getElementById('reset-password-modal');
const closeResetPassword = document.getElementById('close-reset-password');
const resetPasswordInput = document.getElementById('reset-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');
const resetPasswordErr = document.getElementById('reset-password-err');
const resetConfirmPasswordErr = document.getElementById('reset-confirm-password-err');
const resetPasswordError = document.getElementById('reset-password-error');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const resetPasswordText = document.getElementById('reset-password-text');
const resetPasswordLoader = document.getElementById('reset-password-loader');

let forgotPasswordEmail = "";
let forgotPasswordOtpVerified = false;

/* ════════════════════════════
   VIEW TOGGLING
════════════════════════════ */
linkToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  signupView.classList.add('gone');
  loginView.classList.remove('gone');
  brokerView.classList.add('gone');
});

linkToSignup.addEventListener('click', (e) => {
  e.preventDefault();
  loginView.classList.add('gone');
  brokerView.classList.add('gone');
  signupView.classList.remove('gone');
});

/* Show the Broker Connection view */
function showBrokerView() {
  signupView.classList.add('gone');
  loginView.classList.add('gone');
  brokerView.classList.remove('gone');
}

/* ════════════════════════════
   EYE TOGGLE
════════════════════════════ */
function toggleEye(input, offIco, onIco) {
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  offIco.classList.toggle('gone',  show);
  onIco.classList.toggle('gone',  !show);
}

eyePwBtn.addEventListener('click', () => toggleEye(pwInput, eyePwOff, eyePwOn));
eyeCfBtn.addEventListener('click', () => toggleEye(cfInput, eyeCfOff, eyeCfOn));
loginEyePw.addEventListener('click', () => toggleEye(loginPw, loginEyePwOff, loginEyePwOn));

/* ════════════════════════════
   STATE HELPERS
════════════════════════════ */
function setErr(input, el, msg) {
  input.classList.add('err');
  input.classList.remove('ok');
  el.textContent = msg;
}

function setOk(input, el) {
  input.classList.remove('err');
  input.classList.add('ok');
  el.textContent = '';
}

function clearState(input, el) {
  input.classList.remove('err', 'ok');
  if (el) el.textContent = '';
}

function formatBackendError(error, fallback = 'Something went wrong') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error.map(item => formatBackendError(item, '')).filter(Boolean).join(' ');
  }
  if (typeof error === 'object') {
    return Object.values(error)
      .map(value => formatBackendError(value, ''))
      .filter(Boolean)
      .join(' ');
  }
  return String(error);
}

/* ════════════════════════════
   VALIDATORS (Signup)
════════════════════════════ */
function validateEmail() {
  const v = emailInput.value.trim();
  if (!v)                                      { setErr(emailInput, emailErr, 'Email is required.');              return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))  { setErr(emailInput, emailErr, 'Enter a valid email address.');   return false; }
  setOk(emailInput, emailErr);
  return true;
}

function validatePassword() {
  const v = pwInput.value;
  if (!v)           { setErr(pwInput, pwErr, 'Password is required.');                  return false; }
  if (v.length < 8) { setErr(pwInput, pwErr, 'Password must be at least 8 characters.'); return false; }
  setOk(pwInput, pwErr);
  return true;
}

function validateConfirm() {
  const pw  = pwInput.value;
  const cpw = cfInput.value;
  if (!cpw) {
    setErr(cfInput, cfErr, 'Please confirm your password.');
    matchLine.className = 'match-line';
    matchLine.textContent = '';
    return false;
  }
  if (pw !== cpw) {
    cfInput.classList.add('err');
    cfInput.classList.remove('ok');
    cfErr.textContent = '';
    matchLine.className  = 'match-line bad';
    matchLine.textContent = 'Passwords do not match.';
    return false;
  }
  setOk(cfInput, cfErr);
  matchLine.className  = 'match-line ok';
  matchLine.textContent = 'Passwords match!';
  return true;
}

function validateTerms() {
  if (!termsCb.checked) {
    termsErr.textContent = 'You must agree to continue.';
    return false;
  }
  termsErr.textContent = '';
  return true;
}

/* ════════════════════════════
   VALIDATORS (Login)
════════════════════════════ */
function validateLoginEmail() {
  const v = loginEmail.value.trim();
  if (!v) { setErr(loginEmail, loginEmailErr, 'Email is required.'); return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr(loginEmail, loginEmailErr, 'Enter a valid email address.'); return false; }
  setOk(loginEmail, loginEmailErr);
  return true;
}

function validateLoginPassword() {
  const v = loginPw.value;
  if (!v) { setErr(loginPw, loginPwErr, 'Password is required.'); return false; }
  setOk(loginPw, loginPwErr);
  return true;
}

/* ════════════════════════════
   LIVE LISTENERS (Signup)
════════════════════════════ */
emailInput.addEventListener('blur',  validateEmail);
emailInput.addEventListener('input', () => {
  if (emailInput.classList.contains('err')) validateEmail();
});

pwInput.addEventListener('blur', validatePassword);
pwInput.addEventListener('input', () => {
  if (pwInput.classList.contains('err')) validatePassword();
  if (cfInput.value.length > 0) liveMatch();
});

cfInput.addEventListener('input', liveMatch);
cfInput.addEventListener('blur',  validateConfirm);

function liveMatch() {
  const pw  = pwInput.value;
  const cpw = cfInput.value;
  if (!cpw) {
    matchLine.className  = 'match-line';
    matchLine.textContent = '';
    clearState(cfInput, cfErr);
    return;
  }
  if (pw === cpw) {
    matchLine.className  = 'match-line ok';
    matchLine.textContent = 'Passwords match!';
    setOk(cfInput, cfErr);
  } else {
    matchLine.className  = 'match-line bad';
    matchLine.textContent = 'Passwords do not match.';
    clearState(cfInput, cfErr);
  }
}

termsCb.addEventListener('change', validateTerms);

/* ════════════════════════════
   LIVE LISTENERS (Login)
════════════════════════════ */
loginEmail.addEventListener('blur', validateLoginEmail);
loginEmail.addEventListener('input', () => {
  if (loginEmail.classList.contains('err')) validateLoginEmail();
});

loginPw.addEventListener('blur', validateLoginPassword);
loginPw.addEventListener('input', () => {
  if (loginPw.classList.contains('err')) validateLoginPassword();
});

/* ════════════════════════════
   FORM SHAKE HELPER
════════════════════════════ */
function shakeFirstErr(container) {
  const bad = container.querySelector('.err');
  if (bad) {
    bad.classList.remove('shake');
    void bad.offsetWidth;          // force reflow
    bad.classList.add('shake');
    bad.addEventListener('animationend', () => bad.classList.remove('shake'), { once: true });
  }
}

/* ════════════════════════════
   FORM SUBMIT (Signup)
════════════════════════════ */
const signupOtpModal = document.getElementById("signup-otp-modal");
const signupOtpError = document.getElementById("signup-otp-error");
const verifySignupOtpBtn = document.getElementById("verify-signup-otp-btn");
const verifySignupOtpText = document.getElementById("verify-signup-otp-text");
const verifySignupOtpLoader = document.getElementById("verify-signup-otp-loader");

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ok = [validateEmail(), validatePassword(), validateConfirm(), validateTerms()].every(Boolean);
  if (!ok) {
    shakeFirstErr(form);
    return;
  }

  /* Loading state */
  btnNext.disabled = true;
  btnLbl.classList.add('gone');
  btnSpin.classList.remove('gone');

  /* Send request to real backend */
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value, password: pwInput.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('[Nextun] OTP Sent for Signup →', data);
      
      // Clear previous OTP
      signupOtpInputs.forEach(input => input.value = "");
      document.getElementById("signup-otp-error").textContent = "";
      signupOtpModal.classList.remove("gone");

      signupOtpInputs[0].focus();

    } else {
      let errMsg = formatBackendError(data.message, 'Registration failed');
      console.error('[Nextun] Signup failed:', errMsg);
      setErr(emailInput, emailErr, errMsg);
      shakeFirstErr(form);
    }
  } catch (error) {
    console.error('[Nextun] Network error:', error);
    setErr(emailInput, emailErr, 'Server connection failed');
  } finally {
    btnNext.disabled = false;
    btnLbl.classList.remove('gone');
    btnSpin.classList.add('gone');
  }
});

/* ════════════════════════════
   SIGNUP OTP VERIFICATION
════════════════════════════ */
const signupOtpInputs = document.querySelectorAll(".signup-otp-input");

signupOtpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value && index < 5) {
            signupOtpInputs[index + 1].focus();
        }
        const otp = [...signupOtpInputs].map(i => i.value).join("");
        if (otp.length === 6) {
            document.getElementById("verify-signup-otp-btn").click();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && input.value === "" && index > 0) {
            signupOtpInputs[index - 1].focus();
        }
    });
});

signupOtpInputs[0]?.addEventListener("paste", (e) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
    if (!pastedData) return;
    pastedData.slice(0, 6).split("").forEach((digit, index) => {
        if (signupOtpInputs[index]) {
            signupOtpInputs[index].value = digit;
        }
    });
    const lastIndex = Math.min(pastedData.length, 6) - 1;
    if (lastIndex >= 0) {
        signupOtpInputs[lastIndex].focus();
    }
});

verifySignupOtpBtn?.addEventListener("click", async () => {
    const otp = [...signupOtpInputs].map(i => i.value).join("");
    if (otp.length != 6) {
        signupOtpError.textContent = "Enter 6 digit OTP";
        document.getElementById("signup-otp-container").classList.add("error");
        setTimeout(() => { document.getElementById("signup-otp-container").classList.remove("error"); }, 400);
        return;
    }

    try {
        verifySignupOtpBtn.disabled = true;
        verifySignupOtpText.classList.add("gone");
        verifySignupOtpLoader.classList.remove("gone");

        const res = await fetch("/api/auth/verify-register-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailInput.value, otp: otp })
        });
        const data = await res.json();

        if (data.success) {
            sessionStorage.setItem("nextunToken", data.token);
            signupOtpError.style.color = "#16a34a";
            signupOtpError.textContent = data.message || "Verified successfully.";
            setTimeout(() => {
                signupOtpModal.classList.add("gone");
                signupOtpError.style.color = "";
                showBrokerView();
                loginEmail.value = emailInput.value;
            }, 700);
        } else {
            signupOtpError.style.color = "";
            signupOtpError.textContent = formatBackendError(data.message, "Incorrect OTP");
            document.getElementById("signup-otp-container").classList.add("error");
            setTimeout(() => { document.getElementById("signup-otp-container").classList.remove("error"); }, 400);
        }
    } catch (e) {
        signupOtpError.textContent = "Server Error";
    } finally {
        verifySignupOtpBtn.disabled = false;
        verifySignupOtpText.classList.remove("gone");
        verifySignupOtpLoader.classList.add("gone");
    }
});

const closeSignupOtp = document.getElementById("close-signup-otp");
if (closeSignupOtp) {
    closeSignupOtp.addEventListener("click", () => {
        signupOtpModal.classList.add("gone");
        signupOtpInputs.forEach(input => input.value = "");
        signupOtpError.textContent = "";
        verifySignupOtpBtn.disabled = false;
        verifySignupOtpText.classList.remove("gone");
        verifySignupOtpLoader.classList.add("gone");
    });
}

signupOtpModal?.addEventListener("click", (e) => {
    if (e.target.id === "signup-otp-modal") {
        signupOtpModal.classList.add("gone");
        signupOtpInputs.forEach(input => input.value = "");
        signupOtpError.textContent = "";
    }
});

/* ════════════════════════════
   FORM SUBMIT (Login)
════════════════════════════ */
const loginOtpModal = document.getElementById("login-otp-modal");
const loginOtpError = document.getElementById("login-otp-error");
const verifyOtpBtn = document.getElementById("verify-login-otp-btn");
const verifyOtpText = document.getElementById("verify-otp-text");
const verifyOtpLoader = document.getElementById("verify-otp-loader");

let loginToken = "";

/* =====================
LOGIN
===================== */

loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const ok = [
        validateLoginEmail(),
        validateLoginPassword()
    ].every(Boolean);

    if(!ok){
        shakeFirstErr(loginForm);
        return;
    }

    loginBtnNext.disabled = true;
    loginBtnLbl.classList.add("gone");
    loginBtnSpin.classList.remove("gone");

    try{

        const res = await fetch("/api/auth/login",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                email:loginEmail.value,
                password:loginPw.value

            })

        });

        const data = await res.json();

        console.log("Login Success");
        console.log(data);

       if(res.ok){

    loginToken = data.token;

    // Clear previous OTP
    loginOtpInputs.forEach(input => input.value = "");

    document.getElementById("login-otp-error").textContent = "";

    document.getElementById("login-otp-modal").classList.remove("gone");

    loginOtpInputs[0].focus();

}
        else{

            setErr(
                loginEmail,
                loginEmailErr,
                data.message || "Login Failed"
            );

            shakeFirstErr(loginForm);

        }

    }

    catch(e){

        setErr(
            loginEmail,
            loginEmailErr,
            "Server connection failed"
        );

    }

    finally{

        loginBtnNext.disabled=false;

        loginBtnLbl.classList.remove("gone");

        loginBtnSpin.classList.add("gone");

    }

});

const loginOtpInputs=document.querySelectorAll(".login-otp-input");

loginOtpInputs.forEach((input,index)=>{

    input.addEventListener("input",(e)=>{

        e.target.value=e.target.value.replace(/\D/g,'');

        if(e.target.value && index<5){

            loginOtpInputs[index+1].focus();

        }

         const otp = [...loginOtpInputs]
        .map(i => i.value)
        .join("");

    if (otp.length === 6) {

        document
            .getElementById("verify-login-otp-btn")
            .click();

    }

    });

    input.addEventListener("keydown",(e)=>{

        if(
            e.key==="Backspace" &&
            input.value==="" &&
            index>0
        ){

            loginOtpInputs[index-1].focus();

        }

    });

});

loginOtpInputs[0].addEventListener("paste", (e) => {

    e.preventDefault();

    const pastedData = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "");

    if (!pastedData) return;

    pastedData
        .slice(0, 6)
        .split("")
        .forEach((digit, index) => {

            if (loginOtpInputs[index]) {
                loginOtpInputs[index].value = digit;
            }

        });

    const lastIndex = Math.min(pastedData.length, 6) - 1;

    if (lastIndex >= 0) {
        loginOtpInputs[lastIndex].focus();
    }

});

document
.getElementById("verify-login-otp-btn")
.addEventListener("click",async()=>{

    const otp=[...loginOtpInputs]
        .map(i=>i.value)
        .join("");

    if(otp.length!=6){

        document
        .getElementById("login-otp-error")
        .textContent="Enter 6 digit OTP";

        document
        .getElementById("login-otp-container")
        .classList.add("error");

        setTimeout(()=>{

            document
            .getElementById("login-otp-container")
            .classList.remove("error");

        },400);

        return;

    }

    try{

      verifyOtpBtn.disabled = true;

verifyOtpText.classList.add("gone");
verifyOtpLoader.classList.remove("gone");

        const res=await fetch("/api/auth/verify-login-otp",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                email:loginEmail.value,

                otp:otp

            })

        });

        const data=await res.json();

        if(data.success){

            sessionStorage.setItem(
                "nextunToken",
                loginToken
            );

            document
            .getElementById("login-otp-modal")
            .classList.add("gone");

            showBrokerView();

        }

        else{

            document
            .getElementById("login-otp-error")
            .textContent="Incorrect OTP";

            document
            .getElementById("login-otp-container")
            .classList.add("error");

            setTimeout(()=>{

                document
                .getElementById("login-otp-container")
                .classList.remove("error");

            },400);

        }

    }

    catch(e){

        document
        .getElementById("login-otp-error")
        .textContent="Server Error";

    }

    finally {

    verifyOtpBtn.disabled = false;

    verifyOtpText.classList.remove("gone");
    verifyOtpLoader.classList.add("gone");

}

});

const closeLoginOtp = document.getElementById("close-login-otp");
closeLoginOtp.addEventListener("click", () => {

    // Close popup
    loginOtpModal.classList.add("gone");

    // Clear OTP boxes
    loginOtpInputs.forEach(input => input.value = "");

    // Clear error
    loginOtpError.textContent = "";

    // Enable Verify button again
    verifyOtpBtn.disabled = false;
    verifyOtpText.classList.remove("gone");
    verifyOtpLoader.classList.add("gone");

});

document.getElementById("login-otp-modal").addEventListener("click", (e) => {

    if (e.target.id === "login-otp-modal") {

        document.getElementById("login-otp-modal").classList.add("gone");

        loginOtpInputs.forEach(input => input.value = "");

        document.getElementById("login-otp-error").textContent = "";

    }

});

/* ════════════════════════════
   FORGOT PASSWORD
════════════════════════════ */
function validateForgotEmail() {
  const v = forgotEmail.value.trim();
  if (!v) { setErr(forgotEmail, forgotEmailErr, 'Email is required.'); return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr(forgotEmail, forgotEmailErr, 'Enter a valid email address.'); return false; }
  setOk(forgotEmail, forgotEmailErr);
  return true;
}

function validateResetPassword() {
  const v = resetPasswordInput.value;
  if (!v) { setErr(resetPasswordInput, resetPasswordErr, 'Password is required.'); return false; }
  if (v.length < 6) { setErr(resetPasswordInput, resetPasswordErr, 'Password must be at least 6 characters.'); return false; }
  setOk(resetPasswordInput, resetPasswordErr);
  return true;
}

function validateResetConfirmPassword() {
  const pw = resetPasswordInput.value;
  const cpw = resetConfirmPasswordInput.value;
  if (!cpw) { setErr(resetConfirmPasswordInput, resetConfirmPasswordErr, 'Please confirm your password.'); return false; }
  if (pw !== cpw) { setErr(resetConfirmPasswordInput, resetConfirmPasswordErr, 'Passwords do not match.'); return false; }
  setOk(resetConfirmPasswordInput, resetConfirmPasswordErr);
  return true;
}

function closeForgotPasswordFlow() {
  forgotPasswordEmail = "";
  forgotPasswordOtpVerified = false;
  forgotPasswordModal.classList.add("gone");
  forgotPasswordOtpModal.classList.add("gone");
  resetPasswordModal.classList.add("gone");
  forgotPasswordError.textContent = "";
  forgotPasswordOtpError.textContent = "";
  resetPasswordError.textContent = "";
  forgotEmailErr.textContent = "";
  resetPasswordErr.textContent = "";
  resetConfirmPasswordErr.textContent = "";
  forgotEmail.classList.remove("err", "ok");
  resetPasswordInput.classList.remove("err", "ok");
  resetConfirmPasswordInput.classList.remove("err", "ok");
  document.querySelectorAll(".forgot-password-otp-input").forEach(input => input.value = "");
}

forgotPasswordLink?.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordEmail = "";
  forgotPasswordOtpVerified = false;
  closeForgotPasswordFlow();
  forgotEmail.value = loginEmail.value.trim();
  forgotPasswordModal.classList.remove("gone");
  forgotEmail.focus();
});

forgotEmail?.addEventListener("blur", validateForgotEmail);
forgotEmail?.addEventListener("input", () => {
  if (forgotEmail.classList.contains("err")) validateForgotEmail();
});

sendForgotPasswordOtpBtn?.addEventListener("click", async () => {
  if (!validateForgotEmail()) return;

  sendForgotPasswordOtpBtn.disabled = true;
  sendForgotPasswordOtpText.classList.add("gone");
  sendForgotPasswordOtpLoader.classList.remove("gone");
  forgotPasswordError.textContent = "";

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail.value })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      forgotPasswordEmail = forgotEmail.value.trim();
      forgotPasswordModal.classList.add("gone");
      document.querySelectorAll(".forgot-password-otp-input").forEach(input => input.value = "");
      forgotPasswordOtpError.textContent = "";
      forgotPasswordOtpModal.classList.remove("gone");
      document.querySelector(".forgot-password-otp-input")?.focus();
    } else {
      forgotPasswordError.textContent = formatBackendError(data.message, "Unable to send OTP");
    }
  } catch (e) {
    forgotPasswordError.textContent = "Server connection failed";
  } finally {
    sendForgotPasswordOtpBtn.disabled = false;
    sendForgotPasswordOtpText.classList.remove("gone");
    sendForgotPasswordOtpLoader.classList.add("gone");
  }
});

const forgotPasswordOtpInputs = document.querySelectorAll(".forgot-password-otp-input");

forgotPasswordOtpInputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
    if (e.target.value && index < 5) {
      forgotPasswordOtpInputs[index + 1].focus();
    }
    const otp = [...forgotPasswordOtpInputs].map(i => i.value).join("");
    if (otp.length === 6) {
      verifyForgotPasswordOtpBtn.click();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && input.value === "" && index > 0) {
      forgotPasswordOtpInputs[index - 1].focus();
    }
  });
});

forgotPasswordOtpInputs[0]?.addEventListener("paste", (e) => {
  e.preventDefault();
  const pastedData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
  if (!pastedData) return;
  pastedData.slice(0, 6).split("").forEach((digit, index) => {
    if (forgotPasswordOtpInputs[index]) {
      forgotPasswordOtpInputs[index].value = digit;
    }
  });
  const lastIndex = Math.min(pastedData.length, 6) - 1;
  if (lastIndex >= 0) {
    forgotPasswordOtpInputs[lastIndex].focus();
  }
});

verifyForgotPasswordOtpBtn?.addEventListener("click", async () => {
  const otp = [...forgotPasswordOtpInputs].map(i => i.value).join("");
  if (otp.length !== 6) {
    forgotPasswordOtpError.textContent = "Enter 6 digit OTP";
    document.getElementById("forgot-password-otp-container").classList.add("error");
    setTimeout(() => { document.getElementById("forgot-password-otp-container").classList.remove("error"); }, 400);
    return;
  }

  verifyForgotPasswordOtpBtn.disabled = true;
  verifyForgotPasswordOtpText.classList.add("gone");
  verifyForgotPasswordOtpLoader.classList.remove("gone");
  forgotPasswordOtpError.textContent = "";

  try {
    const res = await fetch("/api/auth/verify-forgot-password-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotPasswordEmail, otp: otp })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      forgotPasswordOtpVerified = true;
      forgotPasswordOtpModal.classList.add("gone");
      resetPasswordInput.value = "";
      resetConfirmPasswordInput.value = "";
      resetPasswordError.textContent = "";
      resetPasswordModal.classList.remove("gone");
      resetPasswordInput.focus();
    } else {
      forgotPasswordOtpError.textContent = formatBackendError(data.message, "Incorrect OTP");
      document.getElementById("forgot-password-otp-container").classList.add("error");
      setTimeout(() => { document.getElementById("forgot-password-otp-container").classList.remove("error"); }, 400);
    }
  } catch (e) {
    forgotPasswordOtpError.textContent = "Server Error";
  } finally {
    verifyForgotPasswordOtpBtn.disabled = false;
    verifyForgotPasswordOtpText.classList.remove("gone");
    verifyForgotPasswordOtpLoader.classList.add("gone");
  }
});

resetPasswordInput?.addEventListener("blur", validateResetPassword);
resetPasswordInput?.addEventListener("input", () => {
  if (resetPasswordInput.classList.contains("err")) validateResetPassword();
  if (resetConfirmPasswordInput.value.length > 0) validateResetConfirmPassword();
});
resetConfirmPasswordInput?.addEventListener("blur", validateResetConfirmPassword);
resetConfirmPasswordInput?.addEventListener("input", () => {
  if (resetConfirmPasswordInput.classList.contains("err")) validateResetConfirmPassword();
});

resetPasswordBtn?.addEventListener("click", async () => {
  const ok = [validateResetPassword(), validateResetConfirmPassword()].every(Boolean);
  if (!ok) return;

  if (!forgotPasswordOtpVerified) {
    resetPasswordError.textContent = "OTP verification is required before resetting password";
    return;
  }

  resetPasswordBtn.disabled = true;
  resetPasswordText.classList.add("gone");
  resetPasswordLoader.classList.remove("gone");
  resetPasswordError.textContent = "";

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: forgotPasswordEmail,
        newPassword: resetPasswordInput.value,
        confirmPassword: resetConfirmPasswordInput.value
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      resetPasswordError.style.color = "#16a34a";
      resetPasswordError.textContent = data.message || "Password reset successfully.";
      loginEmail.value = forgotPasswordEmail;
      loginPw.value = "";
      setTimeout(() => {
        resetPasswordError.style.color = "";
        closeForgotPasswordFlow();
        loginView.classList.remove("gone");
        signupView.classList.add("gone");
        brokerView.classList.add("gone");
        loginPw.focus();
      }, 900);
    } else {
      resetPasswordError.style.color = "";
      resetPasswordError.textContent = formatBackendError(data.message, "Unable to reset password");
    }
  } catch (e) {
    resetPasswordError.style.color = "";
    resetPasswordError.textContent = "Server connection failed";
  } finally {
    resetPasswordBtn.disabled = false;
    resetPasswordText.classList.remove("gone");
    resetPasswordLoader.classList.add("gone");
  }
});

closeForgotPassword?.addEventListener("click", closeForgotPasswordFlow);
closeForgotPasswordOtp?.addEventListener("click", closeForgotPasswordFlow);
closeResetPassword?.addEventListener("click", closeForgotPasswordFlow);

forgotPasswordModal?.addEventListener("click", (e) => {
  if (e.target.id === "forgot-password-modal") closeForgotPasswordFlow();
});
forgotPasswordOtpModal?.addEventListener("click", (e) => {
  if (e.target.id === "forgot-password-otp-modal") closeForgotPasswordFlow();
});
resetPasswordModal?.addEventListener("click", (e) => {
  if (e.target.id === "reset-password-modal") closeForgotPasswordFlow();
});

/* ════════════════════════════
   GOOGLE BUTTON (stub)
════════════════════════════ */
document.querySelectorAll('.btn-google').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('[Nextun] Continue with Google');
    showBrokerView(); /* After Google auth, also go to broker view */
  });
});

/* ════════════════════════════
   CONNECT BROKER MODAL
════════════════════════════ */
const connectBtn = document.getElementById('btn-connect-angel');
const connectModal = document.getElementById('connect-broker-modal');
const closeBrokerModalBtn = document.getElementById('close-broker-modal');
const connectForm = document.getElementById('angelone-connect-form');
const connectMessage = document.getElementById('connect-message');
const angelSubmitBtn = document.getElementById('angel-submit-btn');

connectBtn.addEventListener('click', () => {
  connectModal.style.display = 'flex';
  connectMessage.style.display = 'none';
});

closeBrokerModalBtn.addEventListener('click', () => {
  connectModal.style.display = 'none';
});

// Close modal if clicking outside
window.addEventListener('click', (e) => {
  if (e.target === connectModal) {
    connectModal.style.display = 'none';
  }
});

// Handle the AngelOne connect form submission — Step 1: Send OTP
connectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const clientId = document.getElementById('angel-client-id').value.trim();
  const pin = document.getElementById('angel-pin').value;

  if (!clientId || !pin) {
    connectMessage.style.display = 'block';
    connectMessage.style.color = '#f03e3e';
    connectMessage.textContent = 'Please enter Client ID and PIN.';
    return;
  }

  angelSubmitBtn.textContent = 'Sending OTP...';
  angelSubmitBtn.disabled = true;
  connectMessage.style.display = 'none';

  try {
    const res = await fetch('/api/angelone/connect', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('nextunToken')}`
      },
      body: JSON.stringify({ clientId, pin })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Show OTP modal
      connectModal.style.display = 'none';
      const angeloneOtpModal = document.getElementById('angelone-otp-modal');
      angeloneOtpModal.style.display = 'flex';
      angeloneOtpModal.classList.remove('gone');

      // Clear previous OTP inputs
      document.querySelectorAll('.angelone-otp-input').forEach(i => i.value = '');
      document.getElementById('angelone-otp-error').textContent = '';

      // Auto-fill in DEBUG mode
      document.querySelectorAll('.angelone-otp-input')[0]?.focus();
    } else {
      connectMessage.style.display = 'block';
      connectMessage.style.color = '#f03e3e';
      connectMessage.textContent = data.message || 'Failed to send OTP.';
    }
  } catch (error) {
    connectMessage.style.display = 'block';
    connectMessage.style.color = '#f03e3e';
    connectMessage.textContent = 'Server connection failed.';
  } finally {
    angelSubmitBtn.textContent = 'Send OTP & Connect';
    angelSubmitBtn.disabled = false;
  }
});

// AngelOne OTP — keyboard navigation
const angeloneOtpInputs = document.querySelectorAll('.angelone-otp-input');
angeloneOtpInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value && index < 5) angeloneOtpInputs[index + 1].focus();
    if ([...angeloneOtpInputs].map(i => i.value).join('').length === 6) {
      document.getElementById('verify-angelone-otp-btn').click();
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && index > 0) angeloneOtpInputs[index - 1].focus();
  });
});

// Step 2: Verify AngelOne OTP
document.getElementById('verify-angelone-otp-btn')?.addEventListener('click', async () => {
  const otp = [...angeloneOtpInputs].map(i => i.value).join('');
  const otpError = document.getElementById('angelone-otp-error');
  const verifyText = document.getElementById('verify-angelone-otp-text');
  const verifyLoader = document.getElementById('verify-angelone-otp-loader');
  const verifyBtn = document.getElementById('verify-angelone-otp-btn');

  if (otp.length !== 6) {
    otpError.textContent = 'Please enter the full 6-digit OTP.';
    return;
  }

  verifyBtn.disabled = true;
  verifyText.classList.add('gone');
  verifyLoader.classList.remove('gone');
  otpError.textContent = '';

  try {
    const res = await fetch('/api/angelone/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('nextunToken')}`
      },
      body: JSON.stringify({ otp })
    });
    const data = await res.json();

    if (data.success) {
      // Connected! Go to dashboard
      window.location.href = '/dashboard';
    } else {
      otpError.textContent = data.message || 'Invalid OTP.';
      angeloneOtpInputs.forEach(i => i.value = '');
      angeloneOtpInputs[0]?.focus();
    }
  } catch (e) {
    otpError.textContent = 'Server error. Please try again.';
  } finally {
    verifyBtn.disabled = false;
    verifyText.classList.remove('gone');
    verifyLoader.classList.add('gone');
  }
});

// Close AngelOne OTP modal
document.getElementById('close-angelone-otp')?.addEventListener('click', () => {
  const m = document.getElementById('angelone-otp-modal');
  m.style.display = 'none';
  m.classList.add('gone');
  connectModal.style.display = 'flex';
});

  // ════════════════════════════
  // CONNECT EXNESS MODAL
  // ════════════════════════════
  const exnessConnectBtn = document.getElementById('btn-connect-exness');
  const exnessModal = document.getElementById('connect-exness-modal');
  const closeExnessModalBtn = document.getElementById('close-exness-modal');
  const exnessForm = document.getElementById('exness-connect-form');
  const exnessMessage = document.getElementById('exness-connect-message');
  const exnessSubmitBtn = document.getElementById('exness-submit-btn');

  if (exnessConnectBtn && exnessModal) {
    exnessConnectBtn.addEventListener('click', () => {
      exnessModal.style.display = 'flex';
      exnessMessage.style.display = 'none';

      // Load saved Exness details if available
      if (localStorage.getItem('exnessRemember') === 'true') {
        const accountIdInput = document.getElementById('exness-account-id');
        const serverInput = document.getElementById('exness-server');
        const rememberInput = document.getElementById('exness-remember');
        
        if (accountIdInput) accountIdInput.value = localStorage.getItem('exnessAccountId') || '';
        if (serverInput) serverInput.value = localStorage.getItem('exnessServer') || '';
        if (rememberInput) rememberInput.checked = true;
      }
    });

    closeExnessModalBtn.addEventListener('click', () => {
      exnessModal.style.display = 'none';
    });

    // Close modal if clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === exnessModal) {
        exnessModal.style.display = 'none';
      }
    });

    exnessForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const accountId = document.getElementById('exness-account-id').value;
      const password = document.getElementById('exness-password').value;
      const server = document.getElementById('exness-server').value;
      const rememberCheckbox = document.getElementById('exness-remember');

      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('exnessRemember', 'true');
        localStorage.setItem('exnessAccountId', accountId);
        localStorage.setItem('exnessServer', server);
      } else {
        localStorage.removeItem('exnessRemember');
        localStorage.removeItem('exnessAccountId');
        localStorage.removeItem('exnessServer');
      }

      exnessSubmitBtn.textContent = 'Connecting...';
      exnessSubmitBtn.disabled = true;
      exnessMessage.style.display = 'none';

      try {
        const res = await fetch('/api/exness/connect', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('nextunToken')}`
          },
          body: JSON.stringify({ accountId, password, server })
        });
        
        const data = await res.json();
        exnessMessage.style.display = 'block';

        if (data.success) {
          exnessMessage.style.color = '#00b852';
          exnessMessage.textContent = 'Successfully Connected!';
          exnessSubmitBtn.textContent = 'Connected';
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          exnessMessage.style.color = '#ff4d4d';
          exnessMessage.textContent = data.message || 'Connection failed.';
          exnessSubmitBtn.textContent = 'Connect Account';
          exnessSubmitBtn.disabled = false;
        }
      } catch (error) {
        console.error('Error connecting Exness:', error);
        exnessMessage.style.display = 'block';
        exnessMessage.style.color = '#ff4d4d';
        exnessMessage.textContent = 'Server Error. Try again.';
        exnessSubmitBtn.textContent = 'Connect Account';
        exnessSubmitBtn.disabled = false;
      }
    });
  }

  // Handle hash on page load to show the right tab
  if (window.location.hash === '#login') {
    signupView.classList.add('gone');
    brokerView.classList.add('gone');
    loginView.classList.remove('gone');
  } else if (window.location.hash === '#signup') {
    loginView.classList.add('gone');
    brokerView.classList.add('gone');
    signupView.classList.remove('gone');
  }
