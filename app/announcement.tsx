// app/announcement.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
import { useRef } from 'react';

export default function AnnouncementScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const scrollViewRef = useRef<ScrollView>(null);
  const announcementSectionRef = useRef<View>(null);
  const prayerSectionRef = useRef<View>(null);

  const scrollToSection = (sectionRef: React.RefObject<View>) => {
    sectionRef.current?.measureLayout(
      scrollViewRef.current?.getInnerViewNode(),
      (x, y) => {
        scrollViewRef.current?.scrollTo({ y, animated: true });
      },
      () => {}
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '报告事项 & 祷告事项',
          headerShown: true,
		  headerLeft: () => null,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: getFontSizeValue(18),
          },
        }}
      />

      {/* 固定书签导航栏 */}
      <View
        style={[
          styles.bookmarkContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}>
        <TouchableOpacity
          style={[
            styles.bookmarkButton,
            { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => scrollToSection(announcementSectionRef)}>
          <Text
            style={[
              styles.bookmarkText,
              { color: colors.primary, fontSize: getFontSizeValue(14) },
            ]}>
            报告事项
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bookmarkButton,
            { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => scrollToSection(prayerSectionRef)}>
          <Text
            style={[
              styles.bookmarkText,
              { color: colors.primary, fontSize: getFontSizeValue(14) },
            ]}>
            祷告事项
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={true}>
        {/* 报告事项部分 */}
        <View ref={announcementSectionRef} style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(24),
                lineHeight: getFontSizeValue(24) * 1.4,
              },
            ]}>
            报告事项
          </Text>

          <Text
            style={[
              styles.textContent,
              {
                color: colors.text,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(16) * 1.6,
              },
            ]}>
            {`1. 新人受浸
8月31日，主日上午，晏健鵬弟兄與林品彣姊妹於二會所受浸歸入主名。榮耀歸神，阿利路亞！

2. 為喜瑞都召會的兒童代禱
(1) 求主祝福 2025–2026 學年的兒童工作。請為以下負擔代禱：
a  願兒童們對神的認識增加，喜愛兒童聚會，學習彼此尊重顧習。
b 服事者在基督身體的原則裏學習同心合意的事奉，彼此被成全。
c 願主祝福祂的工作，增加兒童人數，帶來許多新家庭，個個都是常存的果子。
(2) 感謝主特別祝福喜瑞都召會，自今年夏天起，我們約有四十位五至八年級的兒童與青少年。為照顧這些神家的青少年，每週一至週四下午 3:00–5:30 會所二樓會開放，提供他們做功課的場地。歡迎家長帶孩子前來，多加使用會所設備。願主祝福，使這些青少年能更穩定地活在神的家中。

3. 喜瑞都社區大學（Cerritos College）校園工作
(1) 社團展覽會（Club Rush）：讚美主！今天我們共接觸了超過40位學生，其中有5位禱告並接受了主（Kevin、Yosin、Daniel、Sawyer 與 Valentina）! 有 18 位在聯絡名單上登記，願意有後續接觸；15 位新生追蹤了我們社團的 Instagram。另外，有6位學員、3位本地大學生（Chris、Hiram、German）、3位學校學生（Ryan、Carl、Jacqueline）、9位社區聖徒，以及1位兒童一同來幫忙，感謝主！
大專生晚餐：已過週四（9月4日）於會所舉行本學期第一次的大專生晚餐，共有6位學生，6位學員，17位社區聖徒，1位青少年與4位兒童，共34位參加。求主繼續祝福，藉這二週一次的晚餐交通，將更多學生帶進召會生活中。
校園讀經：週二（9月9日）開始，每週一次，將追求腓立比書。 
願主將今天所遇見的學生與新人帶來，參加這週四與下週二的聚集，並能進一步與我們建立連結，留在主裏面與住在主裏面。
(2) 請為來自鄰近召會的新生禱告，願他們能與我們的學生、訓練學員及聖徒建立連結，一同追求並在生命中長大。願主為著祂的目的與心意，得著許多常存的果子！

4. 李常受文集展覽
9月7日，主日，下午四點至五點有李常受文集線上分享聚集，歡迎弟兄姊妹踴躍參加。
Meeting ID: 865 7676 6857 (Password: 603550)

5. 二○二六年福音月曆豫購
水流職事站將發行二○二六年福音月曆，10月31日前每份奉獻款爲$14，之後每份為$18。請需要的聖徒向各排服事者聯絡。數量有限，需要的聖徒請盡速登記。

6. 二○二五年感恩節特會
11月27日至11月30日，2025年國際感恩節特會將於印第安納波利斯（Indianapolis, IN)的JW Marriott Indianapolis舉行（10 S. West Street, Indianapolis, IN 46204）；於11月10日前豫訂旅館房間卽可使用水流職事站特會折扣（$119/天，需另外加稅）。
請由以下網址豫訂：https://book.passkey.com/go/LivingStreamMinistry25
聚會將提供各語言的翻譯，鼓勵聖徒們報名參加。`}
          </Text>
        </View>

        {/* 祷告事项部分 */}
        <View ref={prayerSectionRef} style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(24),
                lineHeight: getFontSizeValue(24) * 1.4,
              },
            ]}>
            祷告事项
          </Text>

          <Text
            style={[
              styles.textContent,
              {
                color: colors.text,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(16) * 1.6,
              },
            ]}>
            {`使徒行傳 13:23『從這人的後裔中，神已經照着所應許的，給以色列帶來一位救主，就是耶穌。』

使徒行傳 13:32 – 33『我們也傳福音給你們，就是那給祖宗的應許，神已經向我們這作兒女的完全應驗，叫耶穌復活了，正如詩篇第二篇上所記："你是我的兒子，我今日生了你。"』

羅馬書 8:2『因為生命之靈的律，在基督耶穌裏已經釋放了我，使我脫離了罪與死的律。』

羅馬書 8:37『然而藉着那愛我們的，在這一切的事上，我們已經得勝有餘了。』

哥林多前書 1:23 – 24『我們卻是傳揚釘十字架的基督，對猶太人為絆腳石，對外邦人為愚拙；但對那蒙召的，無論是猶太人、或希利尼人，基督總是神的能力，神的智慧。』

哥林多前書 1:30『但你們得在基督耶穌裏，是出於神，這基督成了從神給我們的智慧：公義、聖別和救贖。』

神的獨生子藉着成為肉體穿上人性，成了神人 ; 然後基督在復活裏生為神的長子，同時祂的信徒也生為神許多的兒子。

三一神已經經過成為肉體、釘死、復活並升天的過程，成了生命之靈的律，裝置在我們靈裏作為"科學的"律，就是自動的原則 ; 這是在神經綸裏最大的發現，甚至是最大的恢復之一。

我們是蒙神所召的人，需要認識並經歷基督的能力和智慧。對那相信基督並呼求祂名的人，祂總是神的能力與神的智慧。釘十字架的基督是神的能力，為要拯救我們 ; 也是神的智慧，為要完成祂的計畫。基督作為神的能力，用大能加強我們，在我們的所是和所作上供應、維持我們。基督作為神的智慧，不斷的從神流向我們，在我們的經歷中，成為我們當下且實際的智慧。

壹、兒童工作
求主祝福 2025–2026 學年的兒童工作。請為以下負擔代禱：

願兒童們對神的認識增加，喜愛兒童聚會，學習彼此尊重顧惜。
服事者在基督身體的原則裏學習同心合意的事奉，彼此被成全。
願主祝福祂的工作，增加兒童人數，帶來許多新家庭，個個都是常存的果子！
貳、青少年工作
請為九月十三日在 Arcadia 舉行的相調聚會代禱。聚會分為二個階段：
第一階段：下午四點半至六點，分為四個組別交通：
(1) 七至八年級；(2) 九至十年級；(3) 十一至十二年級；(4) 父母
晚餐時間：六點至七點
第二階段：七點至八點半，所有聖徒集中在一起聚會
願主祝福這個相調聚會，請為青少年與父母都能得釋放來參加而代禱。
相調聚會細節網址：https://scyp.com/blendingconference/
註冊網址參見周訊。

叁、喜瑞都社區大學（Cerritos College）校園工作
(1) 社團展覽會（Club Rush）：讚美主！今天我們共接觸了超過 40 位學生，其中有5位禱告並接受了主（Kevin、Yosin、Daniel、Sawyer 與 Valentina）! 有 18 位在聯絡名單上登記，願意有後續接觸；15 位新生追蹤了我們社團的 Instagram。另外，有6位學員、3位本地大學生（Chris、Hiram、German）、3位學校學生（Ryan、Carl、Jacqueline）、9 位社區聖徒，以及 1 位兒童一同來幫忙，感謝主!
大專生晚餐：本週四（9/4）開始於會所舉行，在學期中每兩週一次。
校園讀經：下週二（9/9）開始，每週一次，將追求腓立比書。
願主將今天所遇見的學生與新人帶來，參加這週四與下週二的聚集，並能進一步與我們建立連結，留在主裏面與住在主裏面。
(2) 請為來自鄰近召會的新生禱告，願他們能與我們的學生、訓練學員及聖徒建立連結，一同追求並在生命中長大。願主為著祂的目的與心意，得著許多常存的果子！

肆、請為在病痛中的聖徒們代禱。

報告事項：
週三晚上七點半在安那翰職事會議中心有職事聚會，並有華語翻譯服事。鼓勵聖徒一同參加並為聚會代禱。`}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  textContent: {
    lineHeight: 24,
  },
  // 书签导航栏样式
  bookmarkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  bookmarkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  bookmarkText: {
    fontWeight: '600',
  },
});
