"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Target, Info, Edit } from "lucide-react";
import Link from "next/link";
import { getUserProfile, type UserProfile } from "@/lib/db";
import { useDatabase } from "@/components/database-provider";

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isReady } = useDatabase();

  useEffect(() => {
    async function loadProfile() {
      if (!isReady) return;

      try {
        const userProfile = await getUserProfile();
        setProfile(userProfile || null);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [isReady]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">ตั้งค่า</h1>
          <div className="w-16"></div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                ข้อมูลส่วนตัว
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">เพศ</div>
                      <div className="font-medium">
                        {profile.gender === "male" ? "ชาย" : "หญิง"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">อายุ</div>
                      <div className="font-medium">{profile.age} ปี</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">น้ำหนัก</div>
                      <div className="font-medium">{profile.weight} กก.</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">ส่วนสูง</div>
                      <div className="font-medium">{profile.height} ซม.</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">BMR</div>
                        <div className="font-medium text-blue-600">
                          {profile.bmr} kcal
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">TDEE</div>
                        <div className="font-medium text-emerald-600">
                          {profile.tdee} kcal
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">ยังไม่มีข้อมูลส่วนตัว</p>
              )}

              <Link href="/profile">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {profile ? "แก้ไขข้อมูลส่วนตัว" : "ตั้งค่าข้อมูลส่วนตัว"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                เป้าหมาย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span>เป้าหมายแคลอรี่ต่อวัน</span>
                <span className="font-semibold">
                  {profile?.daily_kcal_goal || 2000} kcal
                </span>
              </div>
              {profile && (
                <div className="text-xs text-muted-foreground">
                  อิงจาก TDEE: {profile.tdee} kcal/วัน
                </div>
              )}
              <Link href="/profile">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                >
                  ปรับเป้าหมาย
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                เกี่ยวกับแอป
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>CalKal v1.0.0</p>
                <p>แอปบันทึกแคลอรี่จากรูปถ่าย</p>
                <p>ใช้งานออฟไลน์ได้</p>
                <p>พัฒนาด้วย Next.js + ONNX Runtime</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
