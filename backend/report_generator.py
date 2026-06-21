from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Image
)

from reportlab.lib.styles import getSampleStyleSheet

from charts import (
    create_severity_chart,
    create_risk_chart
)


def generate_pdf(result, filename):

    print("PDF GENERATOR STARTED")

    # Create charts safely
    try:
        create_severity_chart(
            result.get("anomalies", [])
        )

        create_risk_chart(
            result.get(
                "risk_breakdown",
                {
                    "gst_risk": 0,
                    "duplicate_risk": 0,
                    "vendor_risk": 0,
                    "compliance_risk": 0
                }
            )
        )
    except Exception as e:
        print("CHART ERROR:", e)

    pdf = SimpleDocTemplate(filename)

    styles = getSampleStyleSheet()

    content = []

    # ==================================================
    # TITLE
    # ==================================================

    content.append(
        Paragraph(
            "Auditra AI Financial Audit Report",
            styles["Title"]
        )
    )

    content.append(
        Spacer(1, 20)
    )

    # ==================================================
    # EXECUTIVE DASHBOARD
    # ==================================================

    content.append(
        Paragraph(
            "Executive Dashboard",
            styles["Heading1"]
        )
    )

    content.append(
        Paragraph(
            f"Risk Score: {result.get('risk_score', 0)}",
            styles["Heading2"]
        )
    )

    content.append(
        Paragraph(
            f"Amount At Risk: ₹{result.get('amount_at_risk', 0)}",
            styles["Heading2"]
        )
    )

    content.append(
        Paragraph(
            f"Confidence Score: {result.get('confidence_score', 0)}%",
            styles["Heading2"]
        )
    )

    content.append(
        Paragraph(
            f"Risk Level: {result.get('risk_level', 'UNKNOWN')}",
            styles["Heading2"]
        )
    )

    content.append(
        Spacer(1, 20)
    )

    # ==================================================
    # EXECUTIVE SUMMARY
    # ==================================================

    content.append(
        Paragraph(
            "Executive Summary",
            styles["Heading2"]
        )
    )

    content.append(
        Paragraph(
            result.get(
                "summary",
                "No summary available."
            ),
            styles["BodyText"]
        )
    )

    content.append(
        Spacer(1, 20)
    )

    # ==================================================
    # CHARTS
    # ==================================================

    content.append(
        Paragraph(
            "Severity Distribution",
            styles["Heading2"]
        )
    )

    try:
        content.append(
            Image(
                "severity_chart.png",
                width=250,
                height=250
            )
        )
    except Exception as e:
        print("SEVERITY CHART ERROR:", e)

    content.append(
        Spacer(1, 20)
    )

    content.append(
        Paragraph(
            "Risk Breakdown",
            styles["Heading2"]
        )
    )

    try:
        content.append(
            Image(
                "risk_chart.png",
                width=350,
                height=250
            )
        )
    except Exception as e:
        print("RISK CHART ERROR:", e)

    content.append(
        Spacer(1, 20)
    )

    # ==================================================
    # RISK METRICS
    # ==================================================

    content.append(
        Paragraph(
            "Risk Assessment",
            styles["Heading2"]
        )
    )

    content.append(
        Paragraph(
            f"Issues Found: {len(result.get('anomalies', []))}",
            styles["BodyText"]
        )
    )

    content.append(
        Spacer(1, 20)
    )

    # ==================================================
    # DETAILED FINDINGS
    # ==================================================

    content.append(
        Paragraph(
            "Detailed Findings",
            styles["Heading2"]
        )
    )

    content.append(
        Spacer(1, 10)
    )

    for i, anomaly in enumerate(
        result.get("anomalies", []),
        start=1
    ):

        content.append(
            Paragraph(
                f"<b>{i}. {anomaly.get('issue', 'Unknown Issue')}</b>",
                styles["BodyText"]
            )
        )

        content.append(
            Paragraph(
                f"Severity: {anomaly.get('severity', 'Unknown')}",
                styles["BodyText"]
            )
        )

        content.append(
            Paragraph(
                anomaly.get(
                    "reason",
                    "No reason provided."
                ),
                styles["BodyText"]
            )
        )

        content.append(
            Spacer(1, 10)
        )

    # ==================================================
    # RECOMMENDATIONS
    # ==================================================

    content.append(
        Spacer(1, 20)
    )

    content.append(
        Paragraph(
            "Recommendations",
            styles["Heading2"]
        )
    )

    recommendations = result.get(
        "recommendations",
        []
    )

    if recommendations:

        for rec in recommendations:

            content.append(
                Paragraph(
                    f"• {rec}",
                    styles["BodyText"]
                )
            )

    else:

        content.append(
            Paragraph(
                "No recommendations generated.",
                styles["BodyText"]
            )
        )

    # ==================================================
    # CERTIFICATE PAGE
    # ==================================================

    content.append(
        PageBreak()
    )

    content.append(
        Paragraph(
            "AUDIT CERTIFICATE",
            styles["Title"]
        )
    )

    content.append(
        Spacer(1, 20)
    )

    content.append(
        Paragraph(
            f"Risk Level: {result.get('risk_level', 'UNKNOWN')}",
            styles["BodyText"]
        )
    )

    content.append(
        Paragraph(
            f"Confidence Score: {result.get('confidence_score', 0)}%",
            styles["BodyText"]
        )
    )

    content.append(
        Paragraph(
            "Generated By Auditra AI Financial Intelligence Platform",
            styles["BodyText"]
        )
    )

    # ==================================================
    # BUILD PDF
    # ==================================================

    pdf.build(content)

    print("PDF GENERATED SUCCESSFULLY")

    return filename