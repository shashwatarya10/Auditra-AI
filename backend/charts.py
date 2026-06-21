import matplotlib.pyplot as plt


def create_severity_chart(anomalies):

    high = sum(
        1 for a in anomalies
        if a.get("severity", "").lower() == "high"
    )

    medium = sum(
        1 for a in anomalies
        if a.get("severity", "").lower() == "medium"
    )

    low = sum(
        1 for a in anomalies
        if a.get("severity", "").lower() == "low"
    )

    values = [high, medium, low]

    plt.figure(figsize=(5, 5))

    if sum(values) == 0:

        plt.pie(
            [1],
            labels=["No Issues"],
            autopct="%1.0f%%"
        )

    else:

        plt.pie(
            values,
            labels=["High", "Medium", "Low"],
            autopct="%1.0f%%"
        )

    plt.savefig(
        "severity_chart.png"
    )

    plt.close()


def create_risk_chart(risk):

    labels = [
        "GST",
        "Duplicate",
        "Vendor",
        "Compliance"
    ]

    values = [
        risk.get("gst_risk", 0),
        risk.get("duplicate_risk", 0),
        risk.get("vendor_risk", 0),
        risk.get("compliance_risk", 0)
    ]

    plt.figure(figsize=(6, 4))

    plt.bar(
        labels,
        values
    )

    plt.savefig(
        "risk_chart.png"
    )

    plt.close()