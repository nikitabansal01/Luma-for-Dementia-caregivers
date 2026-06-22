import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportData } from "@/src/lib/repo";
import { getBehaviorLabel } from "@/src/lib/behaviorMap";
import { getTriggerLabel } from "@/src/lib/triggerMap";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 8,
  },
  text: {
    marginBottom: 4,
    lineHeight: 1.5,
  },
  listItem: {
    marginBottom: 3,
    marginLeft: 10,
  },
});

export default function ReportPDF({
  data,
  days,
}: {
  data: ReportData;
  days: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Neurologist Summary ({days} days)</Text>

        {data.careContext && (
          <View style={styles.section}>
            <Text style={styles.text}>{data.careContext}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A) Data Confidence</Text>
          <Text style={styles.text}>
            {data.daysWithLogs} / {data.totalDays} days with logs (
            {((data.daysWithLogs / data.totalDays) * 100).toFixed(1)}%)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>B) Top 3 Behaviors</Text>
          {data.topBehaviors.map((b) => (
            <Text key={b.behavior} style={styles.listItem}>
              {getBehaviorLabel(b.behavior)}: {b.count} occurrences, avg severity {b.avgSeverity.toFixed(1)}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>C) Notable Changes vs Previous Period</Text>
          {data.previousPeriodComparison.map((comp) => (
            <Text key={comp.behavior} style={styles.listItem}>
              {getBehaviorLabel(comp.behavior)}: Count {comp.countChange >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(comp.countChange)}, Severity {comp.severityChange >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(comp.severityChange).toFixed(1)}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>D) Top Suspected Triggers</Text>
          <Text style={styles.subsectionTitle}>Overall:</Text>
          {data.topTriggersOverall.map((t) => (
            <Text key={t.trigger} style={styles.listItem}>
              {getTriggerLabel(t.trigger)}: {t.count} occurrences
            </Text>
          ))}
          {Object.entries(data.topTriggersByBehavior).map(([behavior, triggers]) => (
            <View key={behavior}>
              <Text style={styles.subsectionTitle}>For {getBehaviorLabel(behavior)}:</Text>
              {triggers.map((t) => (
                <Text key={t.trigger} style={styles.listItem}>
                  {getTriggerLabel(t.trigger)}: {t.count} occurrences
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>E) What Helped</Text>
          {data.helpfulInterventions.length === 0 ? (
            <Text style={styles.text}>
              No interventions with sufficient data (min 3 occurrences).
            </Text>
          ) : (
            data.helpfulInterventions.map((i) => (
              <Text key={i.intervention} style={styles.listItem}>
                {i.intervention}: {(i.betterRate * 100).toFixed(0)}% better rate ({i.totalCount}{" "}
                occurrences)
              </Text>
            ))
          )}
        </View>
      </Page>
    </Document>
  );
}
