# BeAnimal

웹캠으로 찍는 영상에 **동물 필터**를 씌워서 저장하는 Python 프로젝트입니다.

## 지원 동물
- 카피바라
- 고양이
- 햄스터
- 백곰
- 진돗개
- 호랑이

## 기능
- 실시간 웹캠 미리보기
- 얼굴 감지 후 동물 얼굴 오버레이
- `r` 키로 녹화 시작/종료
- 숫자키 `1~6`으로 동물 변경
- 녹화 파일을 `recordings/`에 저장

## 다운로드해서 바로 실행

GitHub Releases에서 OS에 맞는 파일을 받으시면 됩니다.

- macOS: `BeAnimal-macOS.zip` 안의 `BeAnimal.app`
- Windows: `BeAnimal-Windows.zip` 안의 `BeAnimal.exe`

압축을 푼 뒤 바로 실행하시면 됩니다. Python이나 VSCode는 필요 없습니다.

## 실행 방법

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
beanimal --animal cat
```

또는:

```bash
python -m beanimal --animal tiger
```

## 조작
- `1~6`: 동물 변경
- `r`: 녹화 시작/종료
- `q`: 종료

## 참고
- 이 버전은 외부 AI 모델 없이 **OpenCV + 얼굴 감지 + 동물 오버레이**로 동작합니다.
- 실제 AI 변환형 버전으로도 확장할 수 있도록 코드 구조를 분리해 두었습니다.
