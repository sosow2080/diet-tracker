const express = require("express");
const csv = require("csvtojson");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// JSON Body 파싱
app.use(express.json());

let allowedFoodData = [];
let foodByDate = [];

// allowed_food.csv 로딩
csv()
  .fromFile(path.join(__dirname, "allowed_food.csv"))
  .then((jsonObj) => {
    allowedFoodData = jsonObj;
    console.log("Allowed food CSV loaded");
  })
  .catch(err => console.error("Allowed food CSV load error:", err));

// food_by_date.csv 로딩
csv()
  .fromFile(path.join(__dirname, "food_by_date.csv"))
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



// 새로: 오늘/내일 식단 4줄씩
app.get("/getCurrentDayFood", (req, res) => {
  const now = new Date();

  // day 결정: 4번째 시간 +4h 기준
  const days = [...new Set(foodByDate.map(d => parseInt(d.day)))].sort((a,b)=>a-b);
  let currentDay = days[0];

  for (let i = 0; i < days.length; i++) {
    const dayNum = days[i];
    const dayData = foodByDate.filter(d => parseInt(d.day) === dayNum)
                              .sort((a,b)=>a.time.localeCompare(b.time));

    const fourthTime = dayData[3].time; // 4번째 시간
    const [hh, mm] = fourthTime.split(":").map(Number);
    const fourthDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
    fourthDateTime.setHours(fourthDateTime.getHours() + 4);

    if (now < fourthDateTime) {
      currentDay = dayNum;
      break;
    }
    currentDay = dayNum + 1;
  }

  const dayData = foodByDate.filter(d => parseInt(d.day) === currentDay)
                            .sort((a,b)=>a.time.localeCompare(b.time));
  const lines = dayData.map(item => `${item.time} - ${item.what}`);
  const responseText = `${currentDay}일차 식단:\n` + lines.join("\n");

  res.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: responseText } }] }
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
