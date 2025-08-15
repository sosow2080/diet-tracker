const express = require("express");
const csv = require("csvtojson");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

let allowedFoodData = [];

// CSV 로딩
csv()
  .fromFile(path.join(__dirname, "allowed_food.csv"))
  .then((jsonObj) => {
    allowedFoodData = jsonObj;
    console.log("Allowed food CSV loaded");
  });

app.get("/getAllowedFood", (req, res) => {
  const week = parseInt(req.query.week);
  if (!week || week < 1 || week > 4)
    return res.status(400).json({ error: "week parameter must be 1~4" });

  const weekData = allowedFoodData.find((item) => parseInt(item.week) === week);
  if (!weekData) return res.status(404).json({ error: "Data not found" });

  res.json({ week, food: weekData.food.split(",").map(f => f.trim()) });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
