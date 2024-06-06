export default function validateFields(title, description) {
    if ([title, description].some((field) => field?.trim() === "")) {
      return false;
    }
    return true;
}