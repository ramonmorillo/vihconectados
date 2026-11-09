"""Genera el PDF del manual desde docs/MANUAL_USO.md. Requiere ReportLab (solo edición documental)."""
from pathlib import Path
import re
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
ROOT = Path(__file__).resolve().parents[1]
for name, file in [('Manual','DejaVuSans.ttf'),('ManualBold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, '/usr/share/fonts/truetype/dejavu/'+file))
pdfmetrics.registerFontFamily('Manual',normal='Manual',bold='ManualBold',italic='Manual',boldItalic='ManualBold')
navy=colors.HexColor('#0a3258'); teal=colors.HexColor('#096e70'); muted=colors.HexColor('#475569')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyManual',fontName='Manual',fontSize=9,leading=13.2,textColor=colors.HexColor('#0f172a'),spaceAfter=8))
styles.add(ParagraphStyle(name='TitleManual',parent=styles['BodyManual'],fontName='ManualBold',fontSize=22,leading=28,textColor=navy,spaceAfter=18,keepWithNext=True))
styles.add(ParagraphStyle(name='SubManual',parent=styles['BodyManual'],fontName='ManualBold',fontSize=15,leading=20,textColor=teal,spaceAfter=13,keepWithNext=True))
styles.add(ParagraphStyle(name='HeadManual',parent=styles['BodyManual'],fontName='ManualBold',fontSize=10,leading=14,textColor=teal,spaceBefore=6,spaceAfter=7,keepWithNext=True))
styles.add(ParagraphStyle(name='CellManual',parent=styles['BodyManual'],fontSize=8,leading=11,spaceAfter=0))
styles.add(ParagraphStyle(name='CodeManual',fontName='Courier',fontSize=7,leading=10,textColor=navy,spaceAfter=8))
def inline(s):
    s=escape(s)
    s=re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)',r'<link href="\2" color="#096e70">\1</link>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',s)
    return s
story=[]
pages=(ROOT/'docs/MANUAL_USO.md').read_text().split('<!-- pagina -->')
for pi,page in enumerate(pages):
    if pi: story.append(PageBreak())
    lines=page.strip().splitlines(); i=0
    while i<len(lines):
        line=lines[i].strip();i+=1
        if not line: continue
        if line.startswith('```'):
            code=[]
            while i<len(lines) and not lines[i].strip().startswith('```'):
                code.append(lines[i]);i+=1
            i+=1
            story.append(Paragraph('<br/>'.join(escape(x) for x in code),styles['CodeManual']));continue
        if line.startswith('|'):
            rows=[line]
            while i<len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip());i+=1
            values=[]
            for r in rows:
                cells=[c.strip() for c in r.strip('|').split('|')]
                if all(re.fullmatch(r':?-+:?',c) for c in cells):continue
                values.append([Paragraph(inline(c),styles['CellManual']) for c in cells])
            n=len(values[0]); width=A4[0]-96
            widths=([width*.34,width*.66] if n==2 else [width*.23,width*.40,width*.37])
            if pi==0: widths=[width*.14,width*.86]
            t=Table(values,colWidths=widths,repeatRows=1,hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9f4f3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#dbe5ed'))]))
            story.extend([t,Spacer(1,10)]);continue
        if line.startswith('### '): style='HeadManual';line=line[4:]
        elif line.startswith('## '): style='SubManual';line=line[3:]
        elif line.startswith('# '): style='TitleManual';line=line[2:]
        else: style='BodyManual'
        if line.startswith('- '): line='• '+line[2:]
        story.append(Paragraph(inline(line),styles[style]))
class Pages(canvas.Canvas):
    def __init__(self,*a,**kw):super().__init__(*a,**kw);self.states=[]
    def showPage(self):self.states.append(dict(self.__dict__));self._startPage()
    def save(self):
        total=len(self.states)
        for state in self.states:
            self.__dict__.update(state)
            self.setFillColor(teal);self.rect(0,A4[1]-9,A4[0],9,fill=1,stroke=0)
            self.setFont('ManualBold',8);self.setFillColor(navy);self.drawString(48,A4[1]-30,'vihconectados  /  Manual de uso')
            self.setStrokeColor(colors.HexColor('#e2e8f0'));self.line(48,43,A4[0]-48,43)
            self.setFont('Manual',7);self.setFillColor(muted);self.drawString(48,30,'Edición 09/11/2026 · Demostración con datos sintéticos')
            self.drawRightString(A4[0]-48,30,f'{self._pageNumber} / {total}')
            super().showPage()
        super().save()
doc=SimpleDocTemplate(str(ROOT/'docs/manual-uso.pdf'),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=49,bottomMargin=55,title='vihconectados · Manual de uso',author='vihconectados · Documentación de uso',subject='Manual funcional para Farmacia Hospitalaria e Infecciosas')
doc.build(story,canvasmaker=Pages)
print('Generado docs/manual-uso.pdf')
