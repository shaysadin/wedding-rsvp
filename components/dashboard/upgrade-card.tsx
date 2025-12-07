import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UpgradeCard() {
  return (
    <Card dir="rtl" className="md:max-xl:rounded-none md:max-xl:border-none md:max-xl:shadow-none rounded-xl border bg-background shadow-md">
      <CardHeader className="md:max-xl:px-4">
        <CardTitle>שדרגו לגרסת פרו</CardTitle>
        <CardDescription>
פתחו את כל התכונות וקבלו גישה בלתי מוגבלת לצוות התמיכה שלנו.
        </CardDescription>
      </CardHeader>
      <CardContent className="md:max-xl:px-4">
        <Button size="sm" className="w-full">
          שדרגו
        </Button>
      </CardContent>
    </Card>
  );
}
