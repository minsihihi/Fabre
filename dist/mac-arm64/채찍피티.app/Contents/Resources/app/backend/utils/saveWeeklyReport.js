const { WeeklyReport } = require('../models');  // 모델 경로 맞게 설정

// AI 분석 결과 저장 함수
async function saveWeeklyReport(workoutLogId, totalCaloriesBurned, aiSummary) {
    try {
        // AI 분석 결과 저장
        const analysisResult = aiSummary;  // OpenAI에서 받은 결과를 그대로 사용
        const expectedResults = `If you keep this pace, you will lose ${totalCaloriesBurned * 4} calories in a month.`;
        
        const report = await WeeklyReport.create({
            workout_log_id: workoutLogId,
            analysis_result: analysisResult,
            total_calories_burned: totalCaloriesBurned,
            expected_results: expectedResults,
            feedback: "Keep going! You're doing great."
        });

        return report;
    } catch (error) {
        console.error("AI 분석 결과 저장 오류:", error);
        throw new Error("AI 분석 결과 저장에 실패했습니다.");
    }
}

module.exports = saveWeeklyReport;
