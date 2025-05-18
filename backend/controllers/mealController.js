const { Meal, User } = require('../models');

// `POST` - 트레이너가 식단을 설정
exports.createMeal = async (req, res) => {
    const { carb, protein, fat, mealDate, mealType, imageUrl } = req.body;
    const user = await User.findByPk(req.user.id);

    // 트레이너 권한 확인
    if (user.role !== 'trainer') {
        return res.status(403).json({ message: "You must be a trainer to create a meal" });
    }

    try {
        const meal = await Meal.create({
            userId: req.user.id,
            carb,
            protein,
            fat,
            mealDate,
            mealType,
            imageUrl
        });
        return res.status(201).json(meal);
    } catch (err) {
        return res.status(400).json({ message: "Failed to create meal", error: err });
    }
};

// `PATCH` - 트레이너가 기존 식단 수정
exports.updateMeal = async (req, res) => {
    const { mealId, carb, protein, fat, mealDate, mealType, imageUrl } = req.body;
    const user = await User.findByPk(req.user.id);

    if (user.role !== 'trainer') {
        return res.status(403).json({ message: "You must be a trainer to update a meal" });
    }

    try {
        const meal = await Meal.findByPk(mealId);

        if (!meal) {
            return res.status(404).json({ message: "Meal not found" });
        }

        // 수정할 필드가 있으면 업데이트
        await meal.update({
            carb,
            protein,
            fat,
            mealDate,
            mealType,
            imageUrl
        });

        return res.status(200).json(meal);
    } catch (err) {
        return res.status(400).json({ message: "Failed to update meal", error: err });
    }
};

// `DELETE` - 트레이너가 식단 삭제
exports.deleteMeal = async (req, res) => {
    const { mealId } = req.body;
    const user = await User.findByPk(req.user.id);

    if (user.role !== 'trainer') {
        return res.status(403).json({ message: "You must be a trainer to delete a meal" });
    }

    try {
        const meal = await Meal.findByPk(mealId);

        if (!meal) {
            return res.status(404).json({ message: "Meal not found" });
        }

        await meal.destroy();
        return res.status(200).json({ message: "Meal deleted successfully" });
    } catch (err) {
        return res.status(400).json({ message: "Failed to delete meal", error: err });
    }
};

// `GET` - 모든 유저가 식단을 조회할 수 있도록
exports.getMeals = async (req, res) => {
    try {
        const meals = await Meal.findAll({
            where: {
                userId: req.user.id
            }
        });
        return res.status(200).json(meals);
    } catch (err) {
        return res.status(400).json({ message: "Failed to get meals", error: err });
    }
};
