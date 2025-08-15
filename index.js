const express = require("express");
const csv = require("csvtojson");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// JSON Body 파싱
app.use(express.json());

let allowedFoodData = [];

// CSV 로딩
csv()
  .fromFile(path.join(__dirname, "allowed_food.csv"))
  .then((jsonObj) => {
    allowedFoodData = jsonObj;
    console.log("Allowed food CSV loaded");
  })
  .catch(err => console.error("CSV load error:", err));

// POST /getAllowedFood
app.post("/getAllowedFood", (req, res) => {
  // 카카오 챗봇에서 보내는 POST body 구조에 맞춰 week 값 추출
  const week =
    req.body?.action?.params?.week ||
    req.body?.action?.detailParams?.week?.value;

  if (!week || week < 1 || week > 4) {
    return res.status(400).json({ error: "week parameter must be 1~4" });
  }

  const weekData = allowedFoodData.find(
    (item) => parseInt(item.week) === parseInt(week)
  );

  if (!weekData) {
    return res.status(404).json({ error: "Data not found for this week" });
  }

  // CSV의 food 컬럼에서 값 가져오기
  const foodList = weekData.food.split(",").map((f) => f.trim()).join(", ");

  // 카카오 챗봇 JSON 포맷
  const responseJSON = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `${week}주차 허용식품: ${foodList}`,
          },
        },
      ],
    },
  };

  res.json(responseJSON);
});

// 루트 접근시 간단 안내
app.get("/", (req, res) => {
  res.send("Diet Tracker API is running. POST /getAllowedFood with JSON body.");
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
