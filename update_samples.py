with open('src/pages/AdminCertificatesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("text = 'Candidate Name (e.g., Alex Johnson)'", "text = 'Muhammad Nouman'")
content = content.replace("text = 'alex.johnson@example.com'", "text = 'nouman@example.com'")
content = content.replace("text = 'Full-Stack Engineering Assessment'", "text = 'Full-Stack Engineering'")
content = content.replace("text = 'Rank #1'", "text = '#1'")
content = content.replace("text = new Date().toLocaleDateString()", "text = '08/08/2026'")

with open('src/pages/AdminCertificatesPage.tsx', 'w') as f:
    f.write(content)

