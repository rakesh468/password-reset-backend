import { client } from "./index.js";
import bcrypt from "bcrypt";

async function genpassword(password) {
  const no_of_rounds = 10;
  const salt = await bcrypt.genSalt(no_of_rounds);
  console.log(salt);
  const hashedpassword = await bcrypt.hash(password, salt);
  console.log(hashedpassword);
  return hashedpassword;
}
// genpassword("password@123");

// creating users using insertone ///
async function createUser(data) {
  return client.db("firefox").collection("users").insertOne(data);
}
async function getusername(email) {
  return client.db("firefox").collection("users").findOne({ email: email });
}
// updating pervious password ///
async function passwordUpdate(data) {
  let { email, token } = data;
  let result = await client
    .db("firefox")
    .collection("users")
    .updateOne({ email }, { $set: { password: token } });
  return result;
}
async function updateuser(data) {
  const { email, Password } = data;
  let result = await client
    .db("firefox")
    .collection("users")
    .updateOne({ email }, { $set: { Password: Password } });
  return result;
}

export { genpassword, createUser, getusername, passwordUpdate, updateuser };
