import express, { request, response } from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import {
  genpassword,
  createUser,
  getusername,
  passwordUpdate,
  updateuser,
} from "./helper.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createTransport } from "nodemailer";

dotenv.config();

const app = express();

const PORT = process.env.PORT;
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;

async function Connection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("MongoDB connected");
  return client;
}
export const client = await Connection();

app.get("/", (request, response) => {
  response.send("Hello World");
});

// signup part //
app.post("/signup", async (request, response) => {
  const { username, email, password } = request.body;
  const userfromdb = await getusername(email);
  console.log(userfromdb);

  // validations for signup //
  if (userfromdb) {
    response.status(401).send({ message: "Email Id already exist" });
    return;
  }
  if (password.length < 8) {
    response.status(401).send({ Message: "Password must be longer" });
    return;
  }
  const hashedpassword = await genpassword(password);
  const result = await createUser({
    username,
    email,
    password: hashedpassword,
  });
  console.log(result);
  response.send(result);
});

app.post("/signin", async (request, response) => {
  const { email, password } = request.body;
  // to verify email matches //
  const userfromdb = await getusername(email);

  if (!userfromdb) {
    response.status(401).send({ message: "Invalid Credentials" });
    return;
  }
  const storedpassword = userfromdb.password;
  console.log(storedpassword);

  const ispasswordmatch = await bcrypt.compare(password, storedpassword);

  console.log(ispasswordmatch);

  if (ispasswordmatch) {
    const token = jwt.sign({ id: userfromdb._id }, process.env.SECRET_KEY);
    response.send({ message: "signed In successfully", token: token });
  } else {
    response.send({ messgae: "Invalid Credentials" });
  }
});

// post method for forgotpassword //
app.post("/forgotpassword", async (request, reponse) => {
  const { email } = request.body;
  const userfromdb = await getusername(email);
  console.log(userfromdb);

  if (!userfromdb) {
    reponse.status(401).send({ message: "Invalid Credentials" });
  }
  // token generated if email is in db //
  const token = jwt.sign({ id: userfromdb._id }, process.env.SECRET_KEY);
  const replacepassword = await passwordUpdate({ email, token });
  console.log(replacepassword);
  let updateresult = await getusername({ email });

  // mail to reset password //
  Mail(token, email);
  return response.send({ updateresult, token });
});

// verifying forgetpassword using get method //
app.get("/forgotpassword/verify", async (request, response) => {
  const token = await request.header("x-athu-token");
  const verify = await getusername({ password: token });
  if (!verify) {
    response.status(401).send({ message: "Invalid Credentials" });
  } else {
    response.status(200).send({ message: "token matched" });
  }
});

// reseting password //
app.post("/resetpassword", async (request, response) => {
  const { password, token } = request.body;
  if (password.length < 8) {
    return response.status(401).send("password must be Longer");
  }
  const userfromdb = await getusername({ passsword: token });
  if (!userfromdb) {
    return response.status(401).send({ messgae: "Invalid Credentials" });
  }
  const { email } = userfromdb;
  const hashedpassword = await genpassword(password);
  const passwordUpdate = await updateuser({ email, password: hashedpassword });
  const result = await getusername({ email });
  response.send(result);
});

// generating mail to the user to resetpassword//
function Mail(token, email) {
  // transposrting mail //
  const sender = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.email,
      pass: process.env.password,
    },
  });

  const URL = `http://localhost:9200/forgotpassword/verify/${token}`;
  // composing mail //
  const composemail = {
    from: process.env.email,
    to: email,
    subject: "send mail througn node js",
    html: `<a href=${URL}>To reset password click the link</a>`,
  };
  // sending mail //
  sender.sendMail(composemail, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Mail send successfully" + info.response);
    }
  });
}

app.listen(PORT, () => console.log("PORT is Running in", PORT));
