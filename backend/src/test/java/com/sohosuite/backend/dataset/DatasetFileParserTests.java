package com.sohosuite.backend.dataset.service;

import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import org.junit.jupiter.api.Test;

class DatasetFileParserTests {
    @Test void parsesQuotedCsvValuesWithoutChangingSourceText() throws Exception {
        byte[] input="Item,Note\r\nTea,\"loose, leaf\"\r\nCoffee,\"said \"\"fresh\"\"\"\r\n".getBytes(StandardCharsets.UTF_8);
        assertEquals(List.of(List.of("Item","Note"),List.of("Tea","loose, leaf"),List.of("Coffee","said \"fresh\"")),
                DatasetFileParser.parse(input,"CSV",20,10));
    }

    @Test void rejectsMalformedCsvAndOverLimitRows() {
        assertThrows(IllegalArgumentException.class,()->DatasetFileParser.parse("\"unclosed".getBytes(StandardCharsets.UTF_8),"CSV",20,10));
        assertThrows(IllegalArgumentException.class,()->DatasetFileParser.parse("a\n1\n2\n".getBytes(StandardCharsets.UTF_8),"CSV",1,10));
    }

    @Test void parsesFirstXlsxWorksheetAndSharedStrings() throws Exception {
        Map<String,String> xml=Map.of(
                "xl/workbook.xml","<workbook xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"data\" r:id=\"rId1\"/></sheets></workbook>",
                "xl/_rels/workbook.xml.rels","<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>",
                "xl/sharedStrings.xml","<sst><si><t>Item</t></si><si><t>Tea</t></si></sst>",
                "xl/worksheets/sheet1.xml","<worksheet><sheetData><row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\"><v>Quantity</v></c></row><row r=\"2\"><c r=\"A2\" t=\"s\"><v>1</v></c><c r=\"B2\"><v>4</v></c></row></sheetData></worksheet>");
        assertEquals(List.of(List.of("Item","Quantity"),List.of("Tea","4")),DatasetFileParser.parse(zip(xml),"XLSX",20,10));
    }

    private byte[] zip(Map<String,String> files)throws IOException{
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        try(ZipOutputStream out=new ZipOutputStream(bytes)){for(var entry:files.entrySet()){out.putNextEntry(new ZipEntry(entry.getKey()));out.write(entry.getValue().getBytes(StandardCharsets.UTF_8));out.closeEntry();}}
        return bytes.toByteArray();
    }
}
