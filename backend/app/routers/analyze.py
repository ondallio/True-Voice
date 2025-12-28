# 분석 API 라우터
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ResultResponse,
    Scores,
    FormantAnalysis,
    ToneAnalysis,
)
from app.services.supabase import (
    get_recording,
    update_recording_status,
    save_analysis_result,
    get_analysis_result,
    download_recording_file,
)
from app.services.azure_speech import assess_pronunciation, get_mock_result, convert_to_wav
from app.services.formant_analysis import analyze_formants, get_mock_formant_result
from app.services.tone_analysis import analyze_tone, get_mock_tone_result

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_recording(request: AnalyzeRequest):
    """
    음성 파일을 분석하고 발음 평가 결과를 반환합니다.

    - recording_id: 녹음 ID (Supabase recordings 테이블)
    - reference_text: 평가 기준 텍스트
    - include_formant: 공명 분석 포함 여부 (기본값: True)
    - include_tone: 톤 분석 포함 여부 (기본값: True)
    """
    recording_id = request.recording_id
    reference_text = request.reference_text
    include_formant = request.include_formant
    include_tone = request.include_tone

    # 개발 모드에서는 목업 결과 반환
    if settings.DEV_MODE:
        mock_result = get_mock_result(reference_text)

        # 공명 목업 결과
        formant_analysis = None
        formant_data = None
        if include_formant:
            mock_formant = get_mock_formant_result()
            formant_analysis = FormantAnalysis(
                resonance_score=mock_formant.resonance_score,
                stability_score=mock_formant.stability_score,
                feedback=mock_formant.feedback,
            )
            formant_data = {
                "resonance_score": mock_formant.resonance_score,
                "stability_score": mock_formant.stability_score,
                "feedback": mock_formant.feedback,
            }

        # 톤 목업 결과
        tone_analysis = None
        tone_data = None
        if include_tone:
            mock_tone = get_mock_tone_result()
            tone_analysis = ToneAnalysis(
                tone_score=mock_tone.tone_score,
                stability_score=mock_tone.stability_score,
                clarity_score=mock_tone.clarity_score,
                intonation_score=mock_tone.intonation_score,
                mean_pitch=mock_tone.mean_pitch,
                pitch_range=mock_tone.pitch_range,
                feedback=mock_tone.feedback,
            )
            tone_data = {
                "tone_score": mock_tone.tone_score,
                "stability_score": mock_tone.stability_score,
                "clarity_score": mock_tone.clarity_score,
                "intonation_score": mock_tone.intonation_score,
                "mean_pitch": mock_tone.mean_pitch,
                "pitch_range": mock_tone.pitch_range,
                "feedback": mock_tone.feedback,
            }

        # 목업 결과 저장
        saved_result = save_analysis_result(
            recording_id=recording_id,
            accuracy_score=mock_result.accuracy_score,
            fluency_score=mock_result.fluency_score,
            completeness_score=mock_result.completeness_score,
            pronunciation_score=mock_result.pronunciation_score,
            feedback=mock_result.feedback,
            formant_data=formant_data,
            tone_data=tone_data,
        )

        result_id = saved_result["id"] if saved_result else "mock-result-id"

        return AnalyzeResponse(
            success=True,
            result_id=result_id,
            scores=Scores(
                accuracy=mock_result.accuracy_score,
                fluency=mock_result.fluency_score,
                completeness=mock_result.completeness_score,
                pronunciation=mock_result.pronunciation_score,
            ),
            feedback=mock_result.feedback,
            formant=formant_analysis,
            tone=tone_analysis,
        )

    # 1. 녹음 정보 조회
    recording = get_recording(recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="녹음을 찾을 수 없습니다.")

    # 2. 상태 업데이트: analyzing
    update_recording_status(recording_id, "analyzing")

    try:
        # 3. 음성 파일 다운로드
        audio_data = download_recording_file(recording["file_path"])
        if not audio_data:
            update_recording_status(recording_id, "failed")
            raise HTTPException(status_code=500, detail="음성 파일을 다운로드할 수 없습니다.")

        # 4. 오디오 형식 변환 (M4A/WebM → WAV)
        file_path = recording["file_path"]
        audio_format = "wav"
        if file_path.endswith(".m4a"):
            audio_format = "m4a"
        elif file_path.endswith(".webm"):
            audio_format = "webm"
        elif file_path.endswith(".mp4"):
            audio_format = "mp4"
        
        # WAV로 변환
        wav_audio_data = audio_data
        if audio_format != "wav":
            wav_audio_data = convert_to_wav(audio_data, audio_format)
        
        # 5. Azure 발음 평가
        result = assess_pronunciation(wav_audio_data, reference_text, "wav")

        if not result.success:
            update_recording_status(recording_id, "failed")
            return AnalyzeResponse(
                success=False,
                error=result.error or "발음 평가에 실패했습니다.",
            )

        # 6. 공명 분석 (옵션)
        formant_analysis = None
        formant_data = None
        if include_formant:
            formant_result = analyze_formants(wav_audio_data)
            if formant_result.success:
                formant_analysis = FormantAnalysis(
                    resonance_score=formant_result.resonance_score,
                    stability_score=formant_result.stability_score,
                    feedback=formant_result.feedback,
                )
                formant_data = {
                    "resonance_score": formant_result.resonance_score,
                    "stability_score": formant_result.stability_score,
                    "feedback": formant_result.feedback,
                }

        # 7. 톤 분석 (옵션)
        tone_analysis = None
        tone_data = None
        if include_tone:
            tone_result = analyze_tone(wav_audio_data)
            if tone_result.success:
                tone_analysis = ToneAnalysis(
                    tone_score=tone_result.tone_score,
                    stability_score=tone_result.stability_score,
                    clarity_score=tone_result.clarity_score,
                    intonation_score=tone_result.intonation_score,
                    mean_pitch=tone_result.mean_pitch,
                    pitch_range=tone_result.pitch_range,
                    feedback=tone_result.feedback,
                )
                tone_data = {
                    "tone_score": tone_result.tone_score,
                    "stability_score": tone_result.stability_score,
                    "clarity_score": tone_result.clarity_score,
                    "intonation_score": tone_result.intonation_score,
                    "mean_pitch": tone_result.mean_pitch,
                    "pitch_range": tone_result.pitch_range,
                    "feedback": tone_result.feedback,
                }

        # 8. 결과 저장
        saved_result = save_analysis_result(
            recording_id=recording_id,
            accuracy_score=result.accuracy_score,
            fluency_score=result.fluency_score,
            completeness_score=result.completeness_score,
            pronunciation_score=result.pronunciation_score,
            feedback=result.feedback,
            formant_data=formant_data,
            tone_data=tone_data,
        )

        if not saved_result:
            update_recording_status(recording_id, "failed")
            raise HTTPException(status_code=500, detail="결과 저장에 실패했습니다.")

        # 9. 상태 업데이트: completed
        update_recording_status(recording_id, "completed")

        return AnalyzeResponse(
            success=True,
            result_id=saved_result["id"],
            scores=Scores(
                accuracy=result.accuracy_score,
                fluency=result.fluency_score,
                completeness=result.completeness_score,
                pronunciation=result.pronunciation_score,
            ),
            feedback=result.feedback,
            formant=formant_analysis,
            tone=tone_analysis,
        )

    except HTTPException:
        raise
    except Exception as e:
        update_recording_status(recording_id, "failed")
        print(f"분석 오류: {e}")
        raise HTTPException(status_code=500, detail="분석 중 오류가 발생했습니다.")


@router.get("/results/{result_id}", response_model=ResultResponse)
async def get_result(result_id: str):
    """
    저장된 분석 결과를 조회합니다.

    - result_id: 분석 결과 ID
    """
    # 결과 조회
    result = get_analysis_result(result_id)

    if not result:
        raise HTTPException(status_code=404, detail="결과를 찾을 수 없습니다.")

    # 공명 데이터 변환
    formant_analysis = None
    if result.get("formant_data"):
        fd = result["formant_data"]
        formant_analysis = FormantAnalysis(
            resonance_score=fd.get("resonance_score", 0),
            stability_score=fd.get("stability_score", 0),
            feedback=fd.get("feedback", ""),
        )

    # 톤 데이터 변환
    tone_analysis = None
    if result.get("tone_data"):
        td = result["tone_data"]
        tone_analysis = ToneAnalysis(
            tone_score=td.get("tone_score", 0),
            stability_score=td.get("stability_score", 0),
            clarity_score=td.get("clarity_score", 0),
            intonation_score=td.get("intonation_score", 0),
            mean_pitch=td.get("mean_pitch", 0),
            pitch_range=td.get("pitch_range", 0),
            feedback=td.get("feedback", ""),
        )

    # 응답 반환
    return ResultResponse(
        id=result["id"],
        recording_id=result["recording_id"],
        created_at=result["created_at"],
        scores=Scores(
            accuracy=result["accuracy_score"],
            fluency=result["fluency_score"],
            completeness=result["completeness_score"],
            pronunciation=result["pronunciation_score"],
        ),
        feedback=result["feedback"],
        formant=formant_analysis,
        tone=tone_analysis,
    )
