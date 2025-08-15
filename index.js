const express = require("express");
const csv = require("csvtojson");
const path = require("path");
const dayjs = require("dayjs");

const app = express();
const PORT = process.env.PORT || 3000;


// JSON Body 파싱
app.use(express.json());

let allowedFoodData = [];
let foodByDateData = [];

// allowed_food.csv 로딩
csv()
  .fromFile(path.join(__dirname, "allowed_food.csv"))
  .then((jsonObj) => {
    allowedFoodData = jsonObj;
    console.log("Allowed food CSV loaded");
  })
  .catch(err => console.error("Allowed food CSV load error:", err));

// food_by_day.csv 로딩
csv()
  .fromFile(path.join(__dirname, "food_by_day.csv"))
  .then((jsonObj) => {
    foodByDateData = jsonObj;
    console.log("Food by date CSV loaded");
  })
  .catch(err => console.error("Food by date CSV load error:", err));


// POST /getAllowedFood
app.post("/getAllowedFood", (req, res) => {
  // 카카오 챗봇에서 보내는 POST body 구조에 맞춰 week 값 추출
  const weekStr =
    req.body?.action?.params?.week ||
    req.body?.action?.detailParams?.week?.value;
    
  const allowedWeeks = ["1주차", "2주차", "3주차", "4주차"];
  if (!allowedWeeks.includes(weekStr)) {
    return res.status(400).json({ error: "week parameter must be 1주차~4주차" });
  }

  // CSV에서 문자열로 매칭
  const weekData = allowedFoodData.find(
    (item) => item.week === weekStr.toString()
  );

  if (!weekData) {
    return res.status(404).json({ error: `Data not found for week ${weekStr}` });
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
            text: `${weekStr} 허용 식품은\n\n ${foodList}`,
          },
        },
      ],
    },
  };
  
  res.json(responseJSON);
});


// POST /getDayFood
app.post("/getDayFood", (req, res) => {
  const dayNum = req.body?.action?.params?.day || req.body?.action?.detailParams?.day?.value;
  if (!dayNum) return res.status(400).json({ error: "day parameter is required" });

  const dayData = foodByDateData
    .filter(d => parseInt(d.day) === parseInt(dayNum))
    .slice(0, 4) // 행 순서대로 4개
    .map(d => ({
      ...d,
      what: d.what.trim()
    }));

  if (dayData.length === 0) return res.status(404).json({ error: `No food data for day ${dayNum}` });

  const lines = dayData.map(d => `- ${d.date} ${d.time}에 ${d.what}`);
  const responseText = `${dayNum} 식단은 다음과 같아요!\n\n${lines.join("\n")}`;

  res.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: responseText } }] }
  });
});


app.post("/getProgress", (req, res) => {
  const startDate = dayjs("2025-08-14");
  const endDate = dayjs("2025-09-18");
  const today = dayjs();

  const dayNum = today.diff(startDate, "day") + 1; // 1일차부터 시작
  const totalDays = endDate.diff(startDate, "day") + 1;
  const progressPercent = ((dayNum / totalDays) * 100).toFixed(1);

    // 남은 일수 (D-값)
  const daysLeft = finalDate.diff(today, "day");

  // 메시지
  const message = `오늘은 ${today.format("MM월 DD일")}이야.\n${dayNum}일차임!\n진행도: ${progressPercent}%\nD-${daysLeft}일`;

  res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: message
          }
        }
      ]
    }
  });
});


// 루트 접근시 간단 안내
app.get("/", (req, res) => {
  res.send("Diet Tracker API is running. POST /getAllowedFood with JSON body.");
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
