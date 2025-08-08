require("dotenv").config();

const express = require("express");
const app = express();
const port = 3000;
const { User } = require("./server/models/User");
const { auth } = require("./server/middleware/auth");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB 연결 성공!!"))
  .catch((err) => console.log("에러메세지:::", err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// 회원가입을 위한 라우터
app.post("/api/users/register", async (req, res) => {
  // 회원가입할 때 필요한 정보들을 클라이언트에서 가져오면 그 정보를 데이터베이스에 넣는다.
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    console.log("저장된 사용자:::", savedUser);
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("에러 발생:::", error);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/users/login", (req, res) => {
  // 요청된 이메일을 데이터베이스에서 있는지 찾는다.
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당하는 유저가 없습니다.",
      });
    }

    // 요청된 이메일이 데이터 베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인한다.
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch) {
        return res.json({
          loginSuccess: false,
          message: "비밀번호가 틀렸습니다.",
        });
      }
      // 비밀번호 까지 맞다면 토큰을 생성한다.
      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);

        // 토큰을 저장한다. 어디에....쿠키/로컬스토리지/세션
        req
          .cookieParser("x_auth", user.token)
          .status(200)
          .json({ loginSeccuss: true, userId: user._id });
      });
    });
  });
});

app.get("/api/users/auth", auth, (req, res) => {
  // 인증을 처리하는 곳
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
  });
});

app.get("/api/users/logout", auth, (req, res) => {
  User.findOneAndUpdate(
    { _id: req.user._id },
    {
      token: "",
    },
    (err, user) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({ seccess: true });
    }
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
