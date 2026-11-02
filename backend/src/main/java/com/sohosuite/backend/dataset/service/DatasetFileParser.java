package com.sohosuite.backend.dataset.service;

import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import java.util.zip.*;
import javax.xml.stream.*;

/** Bounded CSV and OOXML reader. It never extracts archive entries or evaluates formulas. */
final class DatasetFileParser {
    private DatasetFileParser() {}

    static List<List<String>> parse(byte[] bytes, String type, int maxRows, int maxColumns) throws IOException {
        return type.equals("CSV") ? csv(bytes,maxRows,maxColumns) : xlsx(bytes,maxRows,maxColumns);
    }
    private static List<List<String>> csv(byte[] bytes,int maxRows,int maxColumns)throws IOException{
        CharsetDecoder decoder=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT);
        try(PushbackReader in=new PushbackReader(new InputStreamReader(new ByteArrayInputStream(bytes),decoder),1)){
            List<List<String>> rows=new ArrayList<>();List<String> row=new ArrayList<>();StringBuilder field=new StringBuilder();boolean quoted=false,afterQuote=false;int n;
            while((n=in.read())!=-1){char c=(char)n;
                if(quoted){if(c=='"'){int next=in.read();if(next=='"')field.append('"');else{quoted=false;afterQuote=true;if(next!=-1)in.unread(next);}}else field.append(c);}
                else if(c==','||c=='\r'||c=='\n'){row.add(field.toString());field.setLength(0);afterQuote=false;if(c==',')continue;if(c=='\r'){int next=in.read();if(next!='\n'&&next!=-1)in.unread(next);}add(rows,row,maxRows,maxColumns);row=new ArrayList<>();}
                else if(c=='"'&&field.isEmpty()&&!afterQuote)quoted=true;
                else if(afterQuote&&Character.isWhitespace(c))continue;
                else if(afterQuote)throw new IllegalArgumentException("Malformed CSV: unexpected data after a quoted field");
                else field.append(c);
                if(row.size()>maxColumns)throw new IllegalArgumentException("File exceeds the 100 column limit");
            }
            if(quoted)throw new IllegalArgumentException("Malformed CSV: unterminated quoted field");
            if(field.length()>0||!row.isEmpty()||afterQuote){row.add(field.toString());add(rows,row,maxRows,maxColumns);}
            return rows;
        }
    }
    private static void add(List<List<String>> rows,List<String> row,int maxRows,int maxColumns){
        if(row.size()>maxColumns)throw new IllegalArgumentException("File exceeds the 100 column limit");
        if(rows.size()>=maxRows+1)throw new IllegalArgumentException("File exceeds the 20,000 row limit");
        rows.add(new ArrayList<>(row));
    }
    private static List<List<String>> xlsx(byte[] bytes,int maxRows,int maxColumns)throws IOException{
        if(bytes.length<4||bytes[0]!='P'||bytes[1]!='K')throw new IllegalArgumentException("The XLSX file is malformed");
        Map<String,byte[]> entries=new HashMap<>();long expanded=0;int count=0;
        try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(bytes))){ZipEntry e;byte[] buf=new byte[8192];while((e=zip.getNextEntry())!=null){
            if(++count>2000)throw new IllegalArgumentException("XLSX archive contains too many entries");
            String name=e.getName();boolean keep=name.equals("xl/workbook.xml")||name.equals("xl/_rels/workbook.xml.rels")||name.equals("xl/sharedStrings.xml")||name.startsWith("xl/worksheets/sheet");
            ByteArrayOutputStream out=keep?new ByteArrayOutputStream():null;int n;while((n=zip.read(buf))!=-1){expanded+=n;if(expanded>40L*1024*1024)throw new IllegalArgumentException("XLSX expands beyond the 40 MiB safety limit");if(keep)out.write(buf,0,n);}if(keep)entries.put(name,out.toByteArray());zip.closeEntry();
        }}catch(ZipException e){throw new IllegalArgumentException("The XLSX file is malformed");}
        byte[] workbook=entries.get("xl/workbook.xml"),relationships=entries.get("xl/_rels/workbook.xml.rels");
        if(workbook==null||relationships==null)throw new IllegalArgumentException("The XLSX workbook is malformed");
        String relation=firstSheetRelation(workbook),target=relationship(relationships,relation);
        String path=target.startsWith("/")?target.substring(1):"xl/"+target.replaceFirst("^\\./","");
        byte[] sheet=entries.get(path);if(sheet==null)throw new IllegalArgumentException("The first XLSX worksheet is missing");
        List<String> shared=entries.containsKey("xl/sharedStrings.xml")?sharedStrings(entries.get("xl/sharedStrings.xml")):List.of();
        return sheet(sheet,shared,maxRows,maxColumns);
    }
    private static XMLInputFactory factory(){XMLInputFactory f=XMLInputFactory.newFactory();f.setProperty(XMLInputFactory.SUPPORT_DTD,false);f.setProperty("javax.xml.stream.isSupportingExternalEntities",false);return f;}
    private static String firstSheetRelation(byte[] xml){try{XMLStreamReader r=factory().createXMLStreamReader(new ByteArrayInputStream(xml));while(r.hasNext())if(r.next()==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("sheet"))for(int i=0;i<r.getAttributeCount();i++)if(r.getAttributeLocalName(i).equals("id"))return r.getAttributeValue(i);throw new IllegalArgumentException("XLSX workbook contains no worksheet");}catch(XMLStreamException e){throw new IllegalArgumentException("XLSX workbook XML is malformed");}}
    private static String relationship(byte[] xml,String id){try{XMLStreamReader r=factory().createXMLStreamReader(new ByteArrayInputStream(xml));while(r.hasNext())if(r.next()==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("Relationship")&&id.equals(r.getAttributeValue(null,"Id")))return r.getAttributeValue(null,"Target");throw new IllegalArgumentException("XLSX worksheet relationship is missing");}catch(XMLStreamException e){throw new IllegalArgumentException("XLSX relationship XML is malformed");}}
    private static List<String> sharedStrings(byte[] xml){List<String> out=new ArrayList<>();try{XMLStreamReader r=factory().createXMLStreamReader(new ByteArrayInputStream(xml));while(r.hasNext())if(r.next()==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("si")){StringBuilder value=new StringBuilder();while(r.hasNext()){int event=r.next();if(event==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("t"))value.append(r.getElementText());else if(event==XMLStreamConstants.END_ELEMENT&&r.getLocalName().equals("si"))break;}out.add(value.toString());}return out;}catch(XMLStreamException e){throw new IllegalArgumentException("XLSX shared strings are malformed");}}
    private static List<List<String>> sheet(byte[] xml,List<String> shared,int maxRows,int maxColumns){
        List<List<String>> out=new ArrayList<>();try{XMLStreamReader r=factory().createXMLStreamReader(new ByteArrayInputStream(xml));while(r.hasNext())if(r.next()==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("row")){
            List<String> row=new ArrayList<>();while(r.hasNext()){int event=r.next();if(event==XMLStreamConstants.END_ELEMENT&&r.getLocalName().equals("row"))break;if(event!=XMLStreamConstants.START_ELEMENT||!r.getLocalName().equals("c"))continue;
            String ref=r.getAttributeValue(null,"r"),type=r.getAttributeValue(null,"t");int col=column(ref,maxColumns);String value="",formula=null;
            while(r.hasNext()){int ce=r.next();if(ce==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("v"))value=r.getElementText();else if(ce==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("f"))formula=r.getElementText();else if(ce==XMLStreamConstants.START_ELEMENT&&r.getLocalName().equals("t"))value=r.getElementText();else if(ce==XMLStreamConstants.END_ELEMENT&&r.getLocalName().equals("c"))break;}
            while(row.size()<=col)row.add("");if("s".equals(type)){int ix=Integer.parseInt(value);if(ix<0||ix>=shared.size())throw new IllegalArgumentException("Invalid XLSX shared string");value=shared.get(ix);}else if("b".equals(type))value="1".equals(value)?"TRUE":"FALSE";else if(formula!=null)value="="+formula;row.set(col,value);
            }
            if(out.size()>=maxRows+1)throw new IllegalArgumentException("File exceeds the 20,000 row limit");out.add(row);
        }return out;}catch(XMLStreamException|NumberFormatException e){throw new IllegalArgumentException("XLSX worksheet is malformed");}
    }
    private static int column(String ref,int max){if(ref==null)throw new IllegalArgumentException("XLSX cell reference is missing");int col=0;for(int i=0;i<ref.length()&&Character.isLetter(ref.charAt(i));i++)col=col*26+Character.toUpperCase(ref.charAt(i))-'A'+1;if(col<1||col>max)throw new IllegalArgumentException("File exceeds the 100 column limit");return col-1;}
}
