const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DOUBAO_MODEL = 'doubao-seed-2-0-mini-260215';

async function analyzeFood(imageBase64, apiKey, modelName) {
  const model = modelName || DOUBAO_MODEL;
  const response = await fetch(DOUBAO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            },
            {
              type: 'text',
              text: `请识别图片中的食物，并遵循以下规则估算营养数值：

1. 先估算图片中食物的实际重量（克），给出一个范围，然后取中间偏上值作为"估计重量"
2. 根据该估计重量，计算对应的热量(kcal)、蛋白质(g)、脂肪(g)、碳水(g)
3. 注意：是图片中这份食物的实际总量，不是每100g的数值

以JSON格式返回（不要包含其他文字）：
{
  "foodName": "食物名称（中文）",
  "estimatedWeight": 估算的克数（仅数字）,
  "calories": 这份食物总热量千卡数（仅数字）,
  "protein": 这份食物蛋白质克数（仅数字）,
  "fat": 这份食物脂肪克数（仅数字）,
  "carbs": 这份食物碳水化合物克数（仅数字）
}
如果图片中没有食物，foodName返回"未识别到食物"，其他值返回0。`
            }
          ]
        }
      ],
      max_tokens: 300
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    foodName: result.foodName || '未知食物',
    estimatedWeight: parseFloat(result.estimatedWeight) || 0,
    calories: parseFloat(result.calories) || 0,
    protein: parseFloat(result.protein) || 0,
    fat: parseFloat(result.fat) || 0,
    carbs: parseFloat(result.carbs) || 0
  };
}
